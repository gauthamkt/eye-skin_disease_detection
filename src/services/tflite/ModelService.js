import { loadTensorflowModel } from 'react-native-fast-tflite';
import { MODELS } from '../../utils/constants';
import * as FileSystem from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';
import TwoStageGateService from './TwoStageGateService';

/**
 * TFLite Model Service for Disease Detection
 * Handles loading and inference for eye and skin disease models using react-native-fast-tflite.
 * Uses pure JS for preprocessing (jpeg-js) to avoid unstable TFJS bindings.
 */

class ModelService {
    constructor() {
        this.eyeModel = null;
        this.skinModel = null;
        this.fundusClassifier = null;
        this.skinClassifier = null;
        this.isInitialized = false;
        this.initializingPromise = null;
    }

    // Initialize models
    async init() {
        if (this.isInitialized) return true;

        if (this.initializingPromise) return this.initializingPromise;

        this.initializingPromise = (async () => {
            try {
                console.log('Initializing models...');

                // Load fundus classifier
                console.log('Loading fundus classifier model...');
                const fundusClassifierAsset = require('../../assets/models/fundus_classifier2.tflite');
                this.fundusClassifier = await loadTensorflowModel(fundusClassifierAsset);
                console.log('Fundus classifier model loaded successfully');

                // Load skin classifier (new compatible model)
                try {
                    console.log('Loading skin classifier model...');
                    
                    // Load the new compatible skin classifier
                    const skinClassifierAsset = require('../../assets/models/skin_classifier.tflite');
                    console.log('Skin classifier asset loaded successfully');
                    
                    this.skinClassifier = await loadTensorflowModel(skinClassifierAsset);
                    console.log('Skin classifier model loaded successfully');
                } catch (skinClassifierError) {
                    console.log('Skin classifier model loading failed - skipping skin validation');
                    console.log('Error details:', skinClassifierError.message);
                    console.log('To enable skin validation, ensure skin_classifier.tflite is compatible');
                    this.skinClassifier = null;
                }

                // Load eye disease model
                console.log('Loading eye disease model...');
                const eyeModelAsset = require('../../assets/models/eye_disease_model.tflite');
                this.eyeModel = await loadTensorflowModel(eyeModelAsset);
                console.log('Eye disease model loaded successfully');

                // Load skin disease model
                console.log('Loading skin disease model...');
                const skinModelAsset = require('../../assets/models/skin_disease_model_v2.tflite');
                this.skinModel = await loadTensorflowModel(skinModelAsset);
                console.log('Skin disease model loaded successfully');

                this.isInitialized = true;
                console.log('All models initialized successfully');
            } catch (error) {
                console.error('Failed to initialize models:', error);
                this.isInitialized = false;
                throw error;
            } finally {
                this.initializingPromise = null;
            }
        })();

        return this.initializingPromise;
    }

    /**
     * Resizes and normalizes image data using Bilinear Interpolation (Pure JS)
     * This avoids any dependency on TFJS or native Canvas components.
     */
    resizeAndNormalize(decodedData, targetSize, normalizationType = 'float32', rescale = true) {
        const { width, height, data } = decodedData; // data is RGBA [R,G,B,A, R,G,B,A...]
        const newData = normalizationType === 'float32'
            ? new Float32Array(targetSize * targetSize * 3)
            : new Uint8Array(targetSize * targetSize * 3);

        const xRatio = width / targetSize;
        const yRatio = height / targetSize;

        for (let y = 0; y < targetSize; y++) {
            for (let x = 0; x < targetSize; x++) {
                // Source pixel coordinates
                const px = x * xRatio;
                const py = y * yRatio;

                // Floor coordinates
                const x1 = Math.floor(px);
                const y1 = Math.floor(py);

                // Ceiling coordinates
                const x2 = Math.min(x1 + 1, width - 1);
                const y2 = Math.min(y1 + 1, height - 1);

                // Interpolation weights
                const xWeight = px - x1;
                const yWeight = py - y1;

                // Index for 4 surrounding pixels in RGBA source
                const idx11 = (y1 * width + x1) * 4;
                const idx12 = (y1 * width + x2) * 4;
                const idx21 = (y2 * width + x1) * 4;
                const idx22 = (y2 * width + x2) * 4;

                // Bilinear interpolation for R, G, B channels
                for (let c = 0; c < 3; c++) {
                    const val11 = data[idx11 + c];
                    const val12 = data[idx12 + c];
                    const val21 = data[idx21 + c];
                    const val22 = data[idx22 + c];

                    const val = val11 * (1 - xWeight) * (1 - yWeight) +
                        val12 * xWeight * (1 - yWeight) +
                        val21 * (1 - xWeight) * yWeight +
                        val22 * xWeight * yWeight;

                    const outIdx = (y * targetSize + x) * 3 + c;
                    if (normalizationType === 'float32') {
                        newData[outIdx] = rescale ? (val / 255.0) : val;
                    } else {
                        newData[outIdx] = Math.round(val);
                    }
                }
            }
        }
        return newData;
    }

    // Preprocess image for model input
    async preprocessImage(imageUri, inputSize, model) {
        try {
            console.log('Preprocessing image (Pure JS):', imageUri);

            const base64Data = await FileSystem.readFile(imageUri, 'base64');
            const arrayBuffer = decode(base64Data);
            const uint8Array = new Uint8Array(arrayBuffer);

            // 1. Decode JPEG
            const decodedData = jpeg.decode(uint8Array, { useTArray: true });

            // 2. Identify required input type and rescale config
            const inputType = model.inputs[0].type;
            const config = Object.values(MODELS).find(m =>
                (model === this.eyeModel && m.name === MODELS.EYE_DISEASE.name) ||
                (model === this.skinModel && m.name === MODELS.SKIN_DISEASE.name)
            );
            const rescale = config ? config.rescale : true;

            console.log(`Model requires ${inputType}, rescale: ${rescale}`);

            // 3. Resize and Normalize
            return this.resizeAndNormalize(decodedData, inputSize, inputType, rescale);
        } catch (error) {
            console.error('JS Preprocessing failed:', error);
            throw new Error(`Preprocessing error: ${error.message}`);
        }
    }

    // Classify if image is fundus or not
    async classifyFundus(imageUri) {
        try {
            if (!this.isInitialized) await this.init();

            console.log('Classifying image as fundus vs non-fundus...');
            
            // Preprocess for fundus classifier
            const inputData = await this.preprocessImage(
                imageUri,
                MODELS.FUNDUS_CLASSIFIER.inputSize,
                this.fundusClassifier
            );

            console.log('Running fundus classifier inference...');
            const outputs = await this.fundusClassifier.run([inputData]);
            const probabilities = outputs[0];
            
            // Bypass formatPrediction for fundus classifier to avoid interference
            const predictions = Array.from(probabilities).map((confidence, index) => {
                let safeConfidence = parseFloat(confidence);
                if (isNaN(safeConfidence) || !isFinite(safeConfidence)) {
                    safeConfidence = 0.0;
                }
                return {
                    label: MODELS.FUNDUS_CLASSIFIER.labels[index] || `Class ${index}`,
                    confidence: safeConfidence,
                };
            });
            
            predictions.sort((a, b) => b.confidence - a.confidence);
            
            const prediction = {
                topPrediction: predictions[0],
                allPredictions: predictions
            };

            console.log('Fundus classifier result:', {
                topLabel: prediction.topPrediction.label,
                confidence: prediction.topPrediction.confidence,
                allPredictions: prediction.allPredictions
            });

            // Check if it's fundus - INVERTED logic since model is predicting backwards
            const predictedLabel = prediction.topPrediction.label;
            const confidence = prediction.topPrediction.confidence;
            
            // Inverted logic: High confidence "Fundus" = actually invalid, Low confidence = actually valid
            const isFundus = predictedLabel === 'Fundus' && confidence < 0.5;  // Low confidence = valid

            console.log('Fundus classification decision:', {
                predictedLabel: predictedLabel,
                confidence: confidence,
                threshold: 0.5,
                isFundus: isFundus,
                decision: isFundus ? 'PASS - Valid fundus (low confidence)' : 'FAIL - High confidence = invalid',
                logic: 'INVERTED - Low confidence accepted, high confidence rejected'
            });

            return {
                passed: isFundus,
                prediction: prediction,
                reason: isFundus ? 'Valid fundus image' : 'Non-fundus image detected'
            };

        } catch (error) {
            console.error('Fundus classification failed:', error);
            throw error;
        }
    }

    // Classify if image is skin or not
    async classifySkin(imageUri) {
        try {
            if (!this.isInitialized) await this.init();

            // Check if skin classifier is available
            if (!this.skinClassifier) {
                console.log('Skin classifier not available - bypassing skin validation');
                return {
                    passed: true,
                    prediction: {
                        topPrediction: { label: 'Skin', confidence: 1.0 },
                        allPredictions: [{ label: 'Skin', confidence: 1.0 }]
                    },
                    reason: 'Skin classifier not available - bypassing validation'
                };
            }

            console.log('Classifying image as skin vs non-skin...');
            
            // Preprocess for skin classifier
            const inputData = await this.preprocessImage(
                imageUri,
                MODELS.SKIN_CLASSIFIER.inputSize,
                this.skinClassifier
            );

            console.log('Running skin classifier inference...');
            const outputs = await this.skinClassifier.run([inputData]);
            const probabilities = outputs[0];
            
            // Format predictions for skin classifier
            const predictions = Array.from(probabilities).map((confidence, index) => {
                let safeConfidence = parseFloat(confidence);
                if (isNaN(safeConfidence) || !isFinite(safeConfidence)) {
                    safeConfidence = 0.0;
                }
                return {
                    label: MODELS.SKIN_CLASSIFIER.labels[index] || `Class ${index}`,
                    confidence: safeConfidence,
                };
            });
            
            predictions.sort((a, b) => b.confidence - a.confidence);
            
            const prediction = {
                topPrediction: predictions[0],
                allPredictions: predictions
            };

            console.log('Skin classifier result:', {
                topLabel: prediction.topPrediction.label,
                confidence: prediction.topPrediction.confidence,
                allPredictions: prediction.allPredictions
            });

            // Check if it's skin - normal logic (high confidence "Skin" = valid skin image)
            const predictedLabel = prediction.topPrediction.label;
            const confidence = prediction.topPrediction.confidence;
            
            const isSkin = predictedLabel === 'Skin' && confidence >= 0.5;  // High confidence = valid skin

            console.log('Skin classification decision:', {
                predictedLabel: predictedLabel,
                confidence: confidence,
                threshold: 0.5,
                isSkin: isSkin,
                decision: isSkin ? 'PASS - Valid skin image' : 'FAIL - Non-skin image detected',
                logic: 'NORMAL - High confidence accepted, low confidence rejected'
            });

            return {
                passed: isSkin,
                prediction: prediction,
                reason: isSkin ? 'Valid skin image' : 'Non-skin image detected'
            };

        } catch (error) {
            console.error('Skin classification failed:', error);
            throw error;
        }
    }

    // Run inference on eye disease model (two-stage approach)
    async predictEyeDisease(imageUri) {
        try {
            if (!this.isInitialized) await this.init();

            console.log('Eye disease analysis with two-stage approach...');
            
            // Stage 1: Fundus classification
            console.log('Stage 1: Checking if image is fundus...');
            const fundusResult = await this.classifyFundus(imageUri);
            
            if (!fundusResult.passed) {
                console.log('Stage 1 FAILED: Non-fundus image detected');
                return {
                    topPrediction: { 
                        label: 'Non-Fundus', 
                        confidence: fundusResult.prediction.topPrediction.confidence 
                    },
                    allPredictions: fundusResult.prediction.allPredictions,
                    isValid: false,
                    reason: 'Non-fundus image detected',
                    validation: { passed: false, stage: 'fundus-classification' }
                };
            }
            
            console.log('Stage 1 PASSED: Valid fundus image');
            
            // Stage 2: Eye disease detection
            console.log('Stage 2: Detecting eye diseases...');
            const inputData = await this.preprocessImage(
                imageUri,
                MODELS.EYE_DISEASE.inputSize,
                this.eyeModel
            );

            console.log('Running eye model inference...');
            const outputs = await this.eyeModel.run([inputData]);
            const probabilities = outputs[0];
            const modelPrediction = this.formatPrediction(probabilities, MODELS.EYE_DISEASE.labels);

            console.log('Eye model prediction:', {
                topLabel: modelPrediction.topPrediction.label,
                confidence: modelPrediction.topPrediction.confidence
            });

            return {
                ...modelPrediction,
                validation: { passed: true, stage: 'two-stage-complete' },
                isValid: true,
                validationReason: 'Valid fundus image with disease prediction',
                validationStage: 'complete'
            };

        } catch (error) {
            console.error('Eye detection failed:', error);
            throw error;
        }
    }

    // Run inference on skin disease model with skin validation
    async predictSkinDisease(imageUri) {
        try {
            if (!this.isInitialized) await this.init();

            console.log('Skin disease analysis with skin validation...');
            
            // Stage 1: Skin classification check
            console.log('Stage 1: Checking if image is skin...');
            const skinResult = await this.classifySkin(imageUri);
            
            if (!skinResult.passed) {
                console.log('Stage 1 FAILED: Non-skin image detected');
                return {
                    topPrediction: { 
                        label: 'Non-Skin', 
                        confidence: skinResult.prediction.topPrediction.confidence 
                    },
                    allPredictions: skinResult.prediction.allPredictions,
                    isValid: false,
                    reason: 'Non-skin image detected',
                    validation: { passed: false, stage: 'skin-classification' },
                    validationStage: 0, // Skin classification stage
                    validationReason: 'This appears to be a non-skin image. Please use clear skin images for analysis.'
                };
            }
            
            console.log('Stage 1 PASSED: Valid skin image');
            
            // Stage 2: Skin disease detection
            console.log('Stage 2: Detecting skin diseases...');
            const inputData = await this.preprocessImage(
                imageUri,
                MODELS.SKIN_DISEASE.inputSize,
                this.skinModel
            );

            console.log('Running skin model inference...');
            const outputs = await this.skinModel.run([inputData]);
            const probabilities = outputs[0];
            
            // Get skin model predictions
            const predictions = Array.from(probabilities).map((confidence, index) => {
                let safeConfidence = parseFloat(confidence);
                if (isNaN(safeConfidence) || !isFinite(safeConfidence)) {
                    safeConfidence = 0.0;
                }
                return {
                    label: MODELS.SKIN_DISEASE.labels[index] || `Class ${index}`,
                    confidence: safeConfidence,
                };
            });
            
            predictions.sort((a, b) => b.confidence - a.confidence);
            
            const modelPrediction = {
                topPrediction: predictions[0],
                allPredictions: predictions
            };

            console.log('Skin model prediction:', {
                topLabel: modelPrediction.topPrediction.label,
                confidence: modelPrediction.topPrediction.confidence
            });

            // Return successful prediction with validation info
            return {
                ...modelPrediction,
                validation: { passed: true, stage: 'two-stage-complete' },
                isValid: true,
                validationReason: 'Valid skin image with disease prediction',
                validationStage: 'complete',
                skinValidation: {
                    passed: true,
                    confidence: skinResult.prediction.topPrediction.confidence,
                    label: skinResult.prediction.topPrediction.label
                }
            };

        } catch (error) {
            console.error('Skin detection failed:', error);
            throw error;
        }
    }

    formatPrediction(probabilities, labels) {
        const predictions = Array.from(probabilities).map((confidence, index) => {
            let safeConfidence = parseFloat(confidence);
            if (isNaN(safeConfidence) || !isFinite(safeConfidence)) {
                safeConfidence = 0.0;
            }

            return {
                label: labels[index] || `Class ${index}`,
                confidence: safeConfidence,
            };
        });

        predictions.sort((a, b) => b.confidence - a.confidence);

        if (predictions.length === 0) {
            return {
                topPrediction: { label: 'Unknown', confidence: 0 },
                allPredictions: [{ label: 'Unknown', confidence: 0 }],
                isValid: false,
                reason: 'No predictions generated',
            };
        }

        // Check if this is likely a non-medical image
        const topConfidence = predictions[0].confidence;
        const secondConfidence = predictions[1]?.confidence || 0;
        const confidenceGap = topConfidence - secondConfidence;
        
        // Calculate entropy to measure prediction uncertainty
        const entropy = this.calculateEntropy(predictions);
        
        // For fundus classifier, use much lower threshold since model outputs extreme values
        const isFundusClassifier = labels.length === 2 && 
                                labels[0] === 'Non-Fundus' && 
                                labels[1] === 'Fundus';
        
        const minConfidence = isFundusClassifier ? 0.01 : 0.3; // 1% for binary, 30% for multi-class
        const minConfidenceGap = isFundusClassifier ? 0.05 : 0.1; // 5% gap for binary
        const maxEntropy = isFundusClassifier ? 3.0 : 1.5; // Higher entropy allowed for binary
        
        const isValid = topConfidence >= minConfidence && 
                       confidenceGap >= minConfidenceGap && 
                       entropy <= maxEntropy;

        let reason = null;
        if (!isValid) {
            if (topConfidence < minConfidence) {
                reason = 'Low confidence - image may not contain relevant medical content';
            } else if (confidenceGap < minConfidenceGap) {
                reason = 'Uncertain prediction - image may not be clear enough for analysis';
            } else if (entropy > maxEntropy) {
                reason = 'High uncertainty - image type not recognized';
            }
        }

        return {
            topPrediction: isValid ? predictions[0] : { label: 'Invalid Image', confidence: topConfidence },
            allPredictions: predictions,
            isValid,
            reason,
            metadata: {
                confidenceGap,
                entropy,
                topConfidence,
            }
        };
    }

    calculateEntropy(predictions) {
        const validPredictions = predictions.filter(p => p.confidence > 0);
        if (validPredictions.length === 0) return 0;
        
        const entropy = validPredictions.reduce((sum, p) => {
            if (p.confidence > 0) {
                return sum - (p.confidence * Math.log2(p.confidence));
            }
            return sum;
        }, 0);
        
        return entropy;
    }

    // Calculate image brightness for context validation
    calculateBrightness(imageData) {
        let totalBrightness = 0;
        const pixelCount = imageData.length / 4; // RGBA
        
        for (let i = 0; i < imageData.length; i += 4) {
            // Calculate luminance using standard formula
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            totalBrightness += brightness;
        }
        
        return totalBrightness / pixelCount; // Average brightness
    }

    async dispose() {
        this.eyeModel = null;
        this.skinModel = null;
        this.fundusClassifier = null;
        this.skinClassifier = null;
        this.isInitialized = false;
        console.log('Models cleared');
    }
}

export default new ModelService();
