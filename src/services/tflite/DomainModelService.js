/**
 * Domain Model Service - Trained Classifier Approach
 * Uses a dedicated TFLite model for domain classification (medical vs non-medical)
 * This is the industry-standard approach for reliable domain detection
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import { MODELS } from '../../utils/constants';
import * as FileSystem from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';

class DomainModelService {
    constructor() {
        this.domainModel = null;
        this.isInitialized = false;
        this.initializingPromise = null;
        
        // Domain classification labels
        this.DOMAIN_LABELS = {
            0: 'non-medical',
            1: 'medical',
            2: 'uncertain'
        };
        
        // Confidence thresholds for domain classification
        this.THRESHOLDS = {
            MEDICAL_CONFIDENCE: 0.7,    // High confidence for medical
            NON_MEDICAL_CONFIDENCE: 0.65, // High confidence for non-medical
            UNCERTAIN_CONFIDENCE: 0.5,    // Low confidence for uncertain
        };
    }

    /**
     * Initialize the domain classifier model
     */
    async init() {
        if (this.isInitialized) return true;

        if (this.initializingPromise) return this.initializingPromise;

        this.initializingPromise = (async () => {
            try {
                console.log('Initializing domain classifier model...');
                console.log('Loading model from: ../../assets/models/fundus_classifier2.tflite');
                
                // Check if model file exists before loading
                const domainModelAsset = require('../../assets/models/fundus_classifier2.tflite');
                console.log('Model asset loaded:', domainModelAsset ? 'SUCCESS' : 'FAILED');
                
                if (!domainModelAsset) {
                    throw new Error('Failed to load fundus_classifier.tflite model file');
                }
                
                this.domainModel = await loadTensorflowModel(domainModelAsset);
                
                if (!this.domainModel) {
                    throw new Error('Failed to initialize TensorFlow model');
                }
                
                console.log('Domain model loaded successfully');
                console.log('Domain model inputs:', this.domainModel.inputs);
                console.log('Domain model outputs:', this.domainModel.outputs);
                
                this.isInitialized = true;
                return true;
            } catch (error) {
                console.error('Domain model initialization failed:', error);
                
                // Fallback to heuristic classification if model not available
                console.log('Falling back to heuristic domain classification...');
                this.isInitialized = false;
                return false;
            } finally {
                this.initializingPromise = null;
            }
        })();

        return this.initializingPromise;
    }

    /**
     * Classify image domain using trained model
     */
    async classifyDomain(imageUri) {
        try {
            // Try to use trained model first
            if (this.isInitialized) {
                return await this.classifyWithModel(imageUri);
            } else {
                // Fallback to heuristic classification
                console.log('Using heuristic domain classification (model not available)');
                return await this.classifyWithHeuristics(imageUri);
            }
        } catch (error) {
            console.error('Domain classification failed:', error);
            return {
                domain: 'unknown',
                confidence: 0,
                reason: `Classification error: ${error.message}`,
                method: 'error'
            };
        }
    }

    /**
     * Classify using trained TFLite model
     */
    async classifyWithModel(imageUri) {
        try {
            console.log('Classifying domain with trained model...');
            
            // Preprocess image for domain model
            const inputData = await this.preprocessForDomainModel(imageUri);
            
            // Run inference
            const outputs = await this.domainModel.run([inputData]);
            const probabilities = outputs[0];
            
            // Get predictions
            const predictions = Array.from(probabilities).map((confidence, index) => ({
                domain: this.DOMAIN_LABELS[index] || 'unknown',
                confidence: parseFloat(confidence) || 0
            }));
            
            // Sort by confidence
            predictions.sort((a, b) => b.confidence - a.confidence);
            
            const topPrediction = predictions[0];
            const secondPrediction = predictions[1];
            
            // Determine final classification
            const classification = this.makeModelClassification(topPrediction, secondPrediction, predictions);
            
            console.log('Model domain classification result:', classification);
            
            return classification;
            
        } catch (error) {
            console.error('Model classification failed:', error);
            throw error;
        }
    }

    /**
     * Preprocess image for domain model
     */
    async preprocessForDomainModel(imageUri) {
        try {
            console.log('Preprocessing image for domain model...');
            
            const base64Data = await FileSystem.readFile(imageUri, 'base64');
            const arrayBuffer = decode(base64Data);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Decode JPEG
            const decodedData = jpeg.decode(uint8Array, { useTArray: true });
            
            // Resize to domain model input size (assuming 224x224)
            const resizedData = this.resizeForModel(decodedData, 224, 224);
            
            // Normalize to [0, 1] range
            const normalizedData = new Float32Array(resizedData.length);
            for (let i = 0; i < resizedData.length; i++) {
                normalizedData[i] = resizedData[i] / 255.0;
            }
            
            return normalizedData;
            
        } catch (error) {
            console.error('Domain model preprocessing failed:', error);
            throw new Error(`Preprocessing error: ${error.message}`);
        }
    }

    /**
     * Resize image for model input
     */
    resizeForModel(decodedData, targetWidth, targetHeight) {
        const { width, height, data } = decodedData;
        const resizedData = new Uint8Array(targetWidth * targetHeight * 3);
        
        const xRatio = width / targetWidth;
        const yRatio = height / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                // Source pixel coordinates
                const srcX = Math.floor(x * xRatio);
                const srcY = Math.floor(y * yRatio);
                
                // Get RGB values
                const srcIndex = (srcY * width + srcX) * 4;
                const r = data[srcIndex];
                const g = data[srcIndex + 1];
                const b = data[srcIndex + 2];
                
                // Target index
                const targetIndex = (y * targetWidth + x) * 3;
                resizedData[targetIndex] = r;
                resizedData[targetIndex + 1] = g;
                resizedData[targetIndex + 2] = b;
            }
        }
        
        return resizedData;
    }

    /**
     * Make final classification from model predictions
     */
    makeModelClassification(topPrediction, secondPrediction, allPredictions) {
        const { domain, confidence } = topPrediction;
        
        // Confidence-based decision logic
        let finalDomain, finalConfidence, reason, isValid;
        
        if (domain === 'medical' && confidence >= this.THRESHOLDS.MEDICAL_CONFIDENCE) {
            finalDomain = 'medical';
            finalConfidence = confidence;
            reason = 'High confidence medical content detected';
            isValid = true;
        } else if (domain === 'non-medical' && confidence >= this.THRESHOLDS.NON_MEDICAL_CONFIDENCE) {
            finalDomain = 'non-medical';
            finalConfidence = confidence;
            reason = 'High confidence non-medical content detected';
            isValid = false;
        } else if (confidence < this.THRESHOLDS.UNCERTAIN_CONFIDENCE) {
            finalDomain = 'uncertain';
            finalConfidence = confidence;
            reason = 'Low confidence - uncertain domain';
            isValid = false;
        } else {
            // Edge case: moderate confidence
            if (domain === 'medical') {
                finalDomain = 'medical';
                finalConfidence = confidence;
                reason = 'Moderate confidence medical content';
                isValid = true; // Allow medical with moderate confidence
            } else {
                finalDomain = 'non-medical';
                finalConfidence = confidence;
                reason = 'Moderate confidence non-medical content';
                isValid = false;
            }
        }
        
        return {
            domain: finalDomain,
            confidence: finalConfidence,
            reason,
            isValid,
            method: 'model',
            predictions: allPredictions,
            topPrediction,
            secondPrediction
        };
    }

    /**
     * Fallback heuristic classification (if model not available)
     */
    async classifyWithHeuristics(imageUri) {
        // Import the heuristic service as fallback
        const DomainClassifierService = require('./DomainClassifierService').default;
        
        const classification = await DomainClassifierService.classifyDomain(imageUri, 'medical');
        
        // Convert heuristic result to match model format
        return {
            domain: classification.domain,
            confidence: classification.confidence,
            reason: classification.reason,
            isValid: classification.isValid,
            method: 'heuristic',
            predictions: [],
            topPrediction: { domain: classification.domain, confidence: classification.confidence },
            secondPrediction: null
        };
    }

    /**
     * Get domain classification statistics
     */
    getClassificationStats(classification) {
        return {
            domain: classification.domain,
            confidence: classification.confidence,
            method: classification.method,
            isValid: classification.isValid,
            recommendation: this.getRecommendation(classification)
        };
    }

    /**
     * Get user recommendation based on classification
     */
    getRecommendation(classification) {
        if (!classification.isValid) {
            if (classification.domain === 'non-medical') {
                return 'Please use medical images (retinal photos for eye analysis, skin photos for skin analysis)';
            } else {
                return 'Image quality is unclear. Please use a clear, well-lit medical image.';
            }
        } else {
            return 'Image is suitable for medical analysis.';
        }
    }

    /**
     * Check if image is suitable for specific medical analysis type
     */
    async isSuitableForAnalysis(imageUri, analysisType) {
        const classification = await this.classifyDomain(imageUri);
        
        if (!classification.isValid) {
            return {
                suitable: false,
                reason: classification.reason,
                recommendation: this.getRecommendation(classification)
            };
        }
        
        // Additional checks for specific analysis types
        if (analysisType === 'eye' && classification.domain === 'medical') {
            return {
                suitable: true,
                reason: 'Medical image suitable for eye disease analysis',
                confidence: classification.confidence
            };
        } else if (analysisType === 'skin' && classification.domain === 'medical') {
            return {
                suitable: true,
                reason: 'Medical image suitable for skin disease analysis',
                confidence: classification.confidence
            };
        }
        
        return {
            suitable: false,
            reason: `Image not suitable for ${analysisType} analysis`,
            recommendation: this.getRecommendation(classification)
        };
    }

    /**
     * Dispose of the model
     */
    async dispose() {
        if (this.domainModel) {
            this.domainModel = null;
            this.isInitialized = false;
            console.log('Domain model disposed');
        }
    }
}

export default new DomainModelService();
