/**
 * Two-Stage Gating Service for Medical Image Validation
 * Implements coarse and fine filtering to improve model reliability
 */

import * as FileSystem from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';
import DomainModelService from './DomainModelService';

class TwoStageGateService {
    constructor() {
        this.stage1Thresholds = {
            minBrightness: 15,      // Slightly stricter
            maxBrightness: 245,     // Slightly stricter
            minContrast: 0.08,      // Stricter contrast
            minSharpness: 0.03,     // Stricter sharpness
            minColorVariance: 75,    // Stricter variance
            maxAspectRatio: 4.0,    // Stricter aspect ratio
            minAspectRatio: 0.25,   // Stricter aspect ratio
        };
        
        this.stage2Thresholds = {
            minConfidence: 0.35,        // Higher confidence threshold
            maxEntropy: 1.5,           // Lower entropy tolerance
            minConfidenceGap: 0.08,     // Higher confidence gap requirement
            minMedicalProbability: 0.35, // Higher medical probability threshold
        };
    }

    /**
     * Stage 0: Context-Aware Domain Classification
     * Validates that image matches the expected analysis type (eye vs skin)
     */
    async stage0DomainClassification(imageUri, expectedType = 'medical') {
        try {
            console.log('Stage 0: Context-aware domain classification started for:', expectedType);
            
            // Initialize domain model if needed
            await DomainModelService.init();
            
            // Classify with context awareness
            const classification = await DomainModelService.classifyDomain(imageUri, expectedType);
            
            console.log('Context-aware domain classification result:', {
                domain: classification.domain,
                confidence: classification.confidence,
                context: classification.context,
                isValid: classification.isValid,
                reason: classification.reason
            });
            
            // Additional context-specific validation
            // For skin disease: skip context validation entirely
            if (expectedType === 'skin') {
                console.log('Skin analysis: Context validation disabled - using domain classification only');
                
                return {
                    classification: classification,
                    isValid: classification.isValid,
                    reason: classification.isValid ? 'Domain validation passed' : classification.reason,
                    context: expectedType,
                    failures: classification.isValid ? [] : ['domain_classification']
                };
            }
            
            const contextValidation = await this.validateImageContext(imageUri, expectedType);
            
            if (!classification.isValid || !contextValidation.isValid) {
                console.log('Stage 0: REJECTING - Context validation failed');
                return {
                    passed: false,
                    stage: 0,
                    reason: classification.isValid ? contextValidation.reason : classification.reason,
                    failures: classification.isValid ? [contextValidation.reason] : [`Invalid domain: ${classification.domain} (${(classification.confidence * 100).toFixed(1)}% confidence)`],
                    classification: {
                        ...classification,
                        contextValidation
                    }
                };
            }
            
            console.log('Stage 0: PASSING - Context validation passed');
            return {
                passed: true,
                stage: 0,
                classification: {
                    ...classification,
                    contextValidation
                }
            };
            
        } catch (error) {
            console.error('Context-aware domain classification error:', error);
            return {
                passed: false,
                stage: 0,
                failures: ['Domain classification failed'],
                reason: `Stage 0 error: ${error.message}`
            };
        }
    }

    /**
     * Validate that image matches expected analysis context
     */
    async validateImageContext(imageUri, expectedType) {
        try {
            console.log('Validating image context for:', expectedType);
            
            // Extract image features for context validation
            const features = await this.extractContextFeatures(imageUri);
            
            // Context-specific validation
            if (expectedType === 'eye') {
                return this.validateEyeContext(features);
            } else if (expectedType === 'skin') {
                return this.validateSkinContext(features);
            } else {
                return { isValid: true, reason: 'No specific context validation' };
            }
            
        } catch (error) {
            console.error('Context validation error:', error);
            return {
                isValid: false,
                reason: 'Context validation failed'
            };
        }
    }

    /**
     * Validate eye-specific image context
     */
    validateEyeContext(features) {
        const failures = [];
        
        // Eye-specific aspect ratio validation
        if (features.aspectRatio < 0.6 || features.aspectRatio > 2.0) {
            failures.push('Aspect ratio not typical for retinal images');
        }
        
        // Eye-specific color validation
        if (features.colorVariance < 60) {
            failures.push('Insufficient color variation for retinal analysis');
        }
        
        // Eye-specific texture validation
        if (features.edgeDensity < 0.05) {
            failures.push('Insufficient edge density for retinal structures');
        }
        
        // Eye-specific brightness validation
        if (features.brightness < 0.2 || features.brightness > 0.8) {
            failures.push('Brightness not suitable for retinal analysis');
        }
        
        // Check for skin-like characteristics (reject for eye analysis)
        if (features.colorUniformity > 0.8 && features.textureScore < 0.1) {
            failures.push('Image appears to be skin/fashion content, not retinal');
        }
        
        return {
            isValid: failures.length === 0,
            reason: failures.length > 0 ? failures.join('; ') : 'Valid eye image context',
            failures
        };
    }

    /**
     * Validate skin-specific image context
     */
    validateSkinContext(features) {
        const failures = [];
        
        // Skin-specific aspect ratio validation
        if (features.aspectRatio < 0.7 || features.aspectRatio > 3.0) {
            failures.push('Aspect ratio not typical for skin examination');
        }
        
        // Skin-specific color validation
        if (features.colorVariance < 80) {
            failures.push('Insufficient color variation for skin analysis');
        }
        
        // Skin-specific texture validation
        if (features.edgeDensity < 0.03) {
            failures.push('Insufficient texture detail for skin analysis');
        }
        
        // Skin-specific brightness validation
        if (features.brightness < 0.25 || features.brightness > 0.85) {
            failures.push('Brightness not suitable for skin analysis');
        }
        
        // Check for eye-like characteristics (reject for skin analysis)
        if (features.aspectRatio < 1.2 && features.colorVariance > 200 && features.edgeDensity > 0.1) {
            failures.push('Image appears to be retinal content, not skin');
        }
        
        return {
            isValid: failures.length === 0,
            reason: failures.length > 0 ? failures.join('; ') : 'Valid skin image context',
            failures
        };
    }

    /**
     * Extract features for context validation
     */
    async extractContextFeatures(imageUri) {
        try {
            const base64Data = await FileSystem.readFile(imageUri, 'base64');
            const arrayBuffer = decode(base64Data);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Decode JPEG
            const decodedData = jpeg.decode(uint8Array, { useTArray: true });
            const { width, height, data } = decodedData;
            
            // Calculate basic features
            const aspectRatio = width / height;
            const brightness = this.calculateBrightness(data);
            const colorVariance = this.calculateColorVariance(data);
            const edgeDensity = this.calculateEdgeDensity(data);
            const textureScore = this.calculateTextureScore(data);
            const colorUniformity = this.calculateColorUniformity(data);
            
            return {
                aspectRatio,
                brightness,
                colorVariance,
                edgeDensity,
                textureScore,
                colorUniformity,
                dimensions: { width, height }
            };
            
        } catch (error) {
            console.error('Context feature extraction failed:', error);
            throw error;
        }
    }

    /**
     * Fallback heuristic domain classification
     */
    async stage0HeuristicClassification(imageUri) {
        try {
            console.log('Stage 0: Using heuristic domain classification fallback');
            
            // Import and use the heuristic service
            const DomainClassifierService = require('./DomainClassifierService').default;
            const classification = await DomainClassifierService.classifyDomain(imageUri, 'medical');
            
            console.log('Heuristic classification result:', classification);
            
            // Apply stricter criteria for heuristic fallback
            if (classification.domain === 'non-medical' && classification.confidence > 0.4) {
                return {
                    passed: false,
                    stage: 0,
                    reason: `Heuristic: ${classification.reason}`,
                    failures: [`Non-medical content detected (${(classification.confidence * 100).toFixed(1)}% confidence)`],
                    classification
                };
            }
            
            if (classification.domain === 'uncertain' && classification.confidence < 0.6) {
                return {
                    passed: false,
                    stage: 0,
                    reason: `Heuristic: ${classification.reason}`,
                    failures: ['Uncertain domain detected'],
                    classification
                };
            }
            
            return {
                passed: true,
                stage: 0,
                classification
            };
            
        } catch (error) {
            console.error('Heuristic classification error:', error);
            return {
                passed: false,
                stage: 0,
                failures: ['Domain classification failed'],
                reason: `Stage 0 error: ${error.message}`
            };
        }
    }

    /**
     * Stage 1: Coarse Image Quality Filtering
     * Fast, lightweight checks for obviously invalid images
     */
    async stage1CoarseFilter(imageUri) {
        try {
            console.log('Stage 1: Coarse filtering started');
            
            const base64Data = await FileSystem.readFile(imageUri, 'base64');
            const arrayBuffer = decode(base64Data);
            const uint8Array = new Uint8Array(arrayBuffer);
            const decodedData = jpeg.decode(uint8Array, { useTArray: true });
            
            const analysis = this.analyzeBasicImageProperties(decodedData);
            const failures = [];
            
            // Brightness check
            if (analysis.avgBrightness < this.stage1Thresholds.minBrightness) {
                failures.push('Image too dark - may be underexposed');
            } else if (analysis.avgBrightness > this.stage1Thresholds.maxBrightness) {
                failures.push('Image too bright - may be overexposed');
            }
            
            // Contrast check
            if (analysis.contrast < this.stage1Thresholds.minContrast) {
                failures.push('Low contrast - image lacks detail');
            }
            
            // Sharpness check (simplified edge detection)
            if (analysis.sharpness < this.stage1Thresholds.minSharpness) {
                failures.push('Image appears blurry or out of focus');
            }
            
            // Color variance check
            if (analysis.colorVariance < this.stage1Thresholds.minColorVariance) {
                failures.push('Low color variation - may be monochrome or simple graphic');
            }
            
            // Aspect ratio check
            if (analysis.aspectRatio > this.stage1Thresholds.maxAspectRatio || 
                analysis.aspectRatio < this.stage1Thresholds.minAspectRatio) {
                failures.push('Unusual aspect ratio - may not be a medical image');
            }
            
            const passed = failures.length === 0;
            
            return {
                passed,
                stage: 1,
                failures,
                analysis,
                reason: passed ? null : failures.join('; ')
            };
            
        } catch (error) {
            return {
                passed: false,
                stage: 1,
                failures: ['Image processing failed'],
                reason: `Stage 1 error: ${error.message}`
            };
        }
    }

    /**
     * Analyze basic image properties for coarse filtering
     */
    analyzeBasicImageProperties(decodedData) {
        const { width, height, data } = decodedData;
        const pixelCount = width * height;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        let edgeCount = 0;
        
        // Sample pixels for performance (every 10th pixel)
        const sampleRate = 10;
        for (let i = 0; i < pixelCount; i += sampleRate * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            totalR += r; totalG += g; totalB += b;
            
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
            minG = Math.min(minG, g); maxG = Math.max(maxG, g);
            minB = Math.min(minB, b); maxB = Math.max(maxB, b);
            
            // Simple edge detection (check neighboring pixels)
            if (i > 0 && i < pixelCount - sampleRate * 4) {
                const nextR = data[i + sampleRate * 4];
                const diff = Math.abs(r - nextR);
                if (diff > 30) edgeCount++;
            }
        }
        
        const sampleCount = pixelCount / (sampleRate * 4);
        const avgR = totalR / sampleCount;
        const avgG = totalG / sampleCount;
        const avgB = totalB / sampleCount;
        const avgBrightness = (avgR + avgG + avgB) / 3;
        
        const rangeR = maxR - minR;
        const rangeG = maxG - minG;
        const rangeB = maxB - minB;
        const contrast = (rangeR + rangeG + rangeB) / (3 * 255);
        
        const colorVariance = rangeR + rangeG + rangeB;
        const sharpness = edgeCount / sampleCount;
        const aspectRatio = width / height;
        
        return {
            avgBrightness,
            contrast,
            sharpness,
            colorVariance,
            aspectRatio,
            dimensions: { width, height }
        };
    }

    /**
     * Stage 2: Fine Medical Content Validation
     * Sophisticated analysis using model uncertainty and medical probability
     */
    async stage2FineFilter(modelPrediction, imageAnalysis) {
        try {
            console.log('Stage 2: Fine filtering started');
            
            const failures = [];
            
            // Confidence threshold
            if (modelPrediction.topPrediction.confidence < this.stage2Thresholds.minConfidence) {
                failures.push('Low model confidence - uncertain prediction');
            }
            
            // Entropy check
            if (modelPrediction.metadata?.entropy > this.stage2Thresholds.maxEntropy) {
                failures.push('High prediction uncertainty - model is confused');
            }
            
            // Confidence gap check
            if (modelPrediction.metadata?.confidenceGap < this.stage2Thresholds.minConfidenceGap) {
                failures.push('Small confidence gap - multiple competing predictions');
            }
            
            // Medical probability estimation (heuristic based on image properties)
            const medicalProbability = this.estimateMedicalProbability(imageAnalysis);
            if (medicalProbability < this.stage2Thresholds.minMedicalProbability) {
                failures.push('Low medical probability - image doesn\'t appear to be medical content');
            }
            
            // Content-specific checks
            const contentValidation = this.validateMedicalContent(modelPrediction, imageAnalysis);
            if (!contentValidation.passed) {
                failures.push(...contentValidation.failures);
            }
            
            const passed = failures.length === 0;
            
            return {
                passed,
                stage: 2,
                failures,
                medicalProbability,
                reason: passed ? null : failures.join('; '),
                metadata: {
                    confidence: modelPrediction.topPrediction.confidence,
                    entropy: modelPrediction.metadata?.entropy,
                    confidenceGap: modelPrediction.metadata?.confidenceGap,
                    medicalProbability
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                stage: 2,
                failures: ['Fine filtering failed'],
                reason: `Stage 2 error: ${error.message}`
            };
        }
    }

    /**
     * Estimate probability that image contains medical content
     */
    estimateMedicalProbability(imageAnalysis) {
        let probability = 0.4; // Lower base probability
        
        // Stricter adjustments based on image properties
        if (imageAnalysis.avgBrightness >= 30 && imageAnalysis.avgBrightness <= 220) {
            probability += 0.1; // Proper lighting (stricter range)
        }
        
        if (imageAnalysis.contrast >= 0.15) {  // Increased from 0.1
            probability += 0.15; // Good contrast
        }
        
        if (imageAnalysis.sharpness >= 0.08) {  // Increased from 0.05
            probability += 0.15; // Good sharpness
        }
        
        if (imageAnalysis.colorVariance >= 150) {  // Increased from 100
            probability += 0.1; // Rich color information
        }
        
        // Stricter aspect ratio preferences
        if (imageAnalysis.aspectRatio >= 0.7 && imageAnalysis.aspectRatio <= 1.8) {
            probability += 0.1; // Typical medical image aspect ratio
        }
        
        // Bonus for reasonable image dimensions
        const { width, height } = imageAnalysis.dimensions;
        if (width >= 300 && height >= 300) {  // Increased from 200
            probability += 0.1; // Reasonable resolution
        }
        
        return Math.min(probability, 1.0);
    }

    /**
     * Validate medical content based on prediction patterns
     */
    validateMedicalContent(modelPrediction, imageAnalysis) {
        const failures = [];
        
        // Stricter check for "Normal" predictions
        if (modelPrediction.topPrediction.label === 'Normal' && 
            modelPrediction.topPrediction.confidence < 0.5) {  // Increased from 0.4
            failures.push('Normal prediction with low confidence - likely non-medical image');
        }
        
        // Check if top predictions are actually medical categories (stricter)
        const medicalLabels = ['Cataract', 'Diabetic Retinopathy', 'Glaucoma', 
                              'Atopic Dermatitis', 'Basal Cell Carcinoma', 'Melanoma', 
                              'Eczema', 'Psoriasis'];
        
        // Remove 'Normal' from valid medical labels for stricter validation
        const top3Medical = modelPrediction.allPredictions.slice(0, 3)
            .filter(pred => medicalLabels.includes(pred.label)).length;
        
        // Require at least 2 out of top 3 to be medical (stricter)
        if (top3Medical < 2) {
            failures.push('Top predictions don\'t match medical categories');
        }
        
        // Additional check: If top prediction is "Normal" with high confidence, still require medical context
        if (modelPrediction.topPrediction.label === 'Normal' && 
            modelPrediction.topPrediction.confidence > 0.7) {
            // Check if other predictions are also medical
            const otherMedical = modelPrediction.allPredictions.slice(1, 4)
                .filter(pred => medicalLabels.includes(pred.label)).length;
            
            if (otherMedical === 0) {
                failures.push('High confidence Normal prediction without medical context');
            }
        }
        
        return {
            passed: failures.length === 0,
            failures
        };
    }

    /**
     * Complete two-stage validation pipeline for eye disease
     * Note: Stage 0 and Stage 1 disabled for eye disease (using original approach)
     */
    async validateImage(imageUri, modelPrediction, expectedType = 'medical') {
        console.log('Starting two-stage validation for eye disease (Stage 0 & 1 disabled)...');
        console.log('Model prediction:', {
            topLabel: modelPrediction.topPrediction.label,
            confidence: modelPrediction.topPrediction.confidence,
            entropy: modelPrediction.metadata?.entropy
        });
        
        // NO filtering for eye disease - direct model predictions only
        if (expectedType === 'eye') {
            console.log('NO filtering for eye disease - using model predictions directly');
            
            // Directly use model prediction without any filtering
            return {
                passed: true,
                stage: 'no-filtering',
                reason: null,
                failures: [],
                metadata: modelPrediction.metadata,
                validationType: 'eye-disease-no-filter'
            };
        }
        
        // For skin disease, use Stage 0 only (no context validation)
        // Stage 0: Context-aware domain classification
        const stage0Result = await this.stage0DomainClassification(imageUri, expectedType);
        console.log('Stage 0 result:', {
            passed: stage0Result.passed,
            domain: stage0Result.classification?.domain,
            confidence: stage0Result.classification?.confidence,
            context: stage0Result.classification?.context
        });
        
        if (!stage0Result.passed) {
            return {
                passed: false,
                stage: 0,
                reason: stage0Result.reason,
                failures: stage0Result.failures,
                classification: stage0Result.classification
            };
        }
        
        // SKIN DISEASE: Skip Stages 1 & 2, use only Stage 0
        if (expectedType === 'skin') {
            console.log('Skin analysis: Using Stage 0 only (context validation disabled)');
            
            return {
                passed: true,
                stage: 0,
                reason: 'Domain validation passed',
                failures: [],
                classification: stage0Result.classification
            };
        }
        
        // Stage 1: Coarse filtering
        const stage1Result = await this.stage1CoarseFilter(imageUri);
        console.log('Stage 1 result:', {
            passed: stage1Result.passed,
            failures: stage1Result.failures,
            analysis: stage1Result.analysis
        });
        
        if (!stage1Result.passed) {
            return {
                passed: false,
                stage: 1,
                reason: stage1Result.reason,
                failures: stage1Result.failures,
                analysis: stage1Result.analysis,
                classification: stage0Result.classification
            };
        }
        
        // Stage 2: Fine filtering
        const stage2Result = await this.stage2FineFilter(modelPrediction, stage1Result.analysis);
        console.log('Stage 2 result:', {
            passed: stage2Result.passed,
            failures: stage2Result.failures,
            medicalProbability: stage2Result.medicalProbability
        });
        
        return {
            passed: stage2Result.passed,
            stage: stage2Result.passed ? 2 : 2, // Failed at stage 2
            reason: stage2Result.reason,
            failures: stage2Result.failures,
            analysis: stage1Result.analysis,
            metadata: stage2Result.metadata,
            classification: stage0Result.classification,
            context: expectedType
        };
    }

    /**
     * Get user-friendly explanation of validation results
     */
    getValidationExplanation(validationResult) {
        if (validationResult.passed) {
            return {
                type: 'success',
                title: ' Image Validated',
                message: 'Image passed quality checks and is suitable for analysis.',
                details: `Validated through ${validationResult.stage} stage(s)`
            };
        }
        
        const explanations = {
            1: {
                title: ' Image Quality Issues',
                message: 'Image doesn\'t meet basic quality requirements.',
                suggestions: [
                    'Ensure proper lighting',
                    'Use a focused, clear image',
                    'Avoid extremely bright or dark images',
                    'Check that the image shows the relevant medical area'
                ]
            },
            2: {
                title: ' Content Validation Failed',
                message: 'Image may not contain appropriate medical content.',
                suggestions: [
                    'Use clear medical images (retinal photos for eye analysis)',
                    'Ensure the image shows the specific condition area',
                    'Avoid general photos, objects, or non-medical content',
                    'Use standard medical imaging formats when possible'
                ]
            }
        };
        
        const stageInfo = explanations[validationResult.stage] || explanations[2];
        
        return {
            type: validationResult.stage === 1 ? 'error' : 'warning',
            ...stageInfo,
            details: validationResult.reason,
            failures: validationResult.failures
        };
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

    // Calculate color variance for context validation
    calculateColorVariance(imageData) {
        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = imageData.length / 4; // RGBA
        
        // Calculate mean values
        for (let i = 0; i < imageData.length; i += 4) {
            totalR += imageData[i];
            totalG += imageData[i + 1];
            totalB += imageData[i + 2];
        }
        
        const meanR = totalR / pixelCount;
        const meanG = totalG / pixelCount;
        const meanB = totalB / pixelCount;
        
        // Calculate variance
        let varianceR = 0, varianceG = 0, varianceB = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            varianceR += Math.pow(imageData[i] - meanR, 2);
            varianceG += Math.pow(imageData[i + 1] - meanG, 2);
            varianceB += Math.pow(imageData[i + 2] - meanB, 2);
        }
        
        const totalVariance = (varianceR + varianceG + varianceB) / (pixelCount * 3);
        return totalVariance;
    }

    // Calculate edge density for context validation
    calculateEdgeDensity(imageData) {
        const width = Math.sqrt(imageData.length / 4);
        const height = width;
        let edgeCount = 0;
        
        // Simple edge detection using Sobel operator
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Get neighboring pixels
                const idxTL = ((y - 1) * width + (x - 1)) * 4;
                const idxTM = ((y - 1) * width + x) * 4;
                const idxTR = ((y - 1) * width + (x + 1)) * 4;
                const idxML = (y * width + (x - 1)) * 4;
                const idxMR = idx;
                const idxBL = ((y + 1) * width + (x - 1)) * 4;
                const idxBM = ((y + 1) * width + x) * 4;
                const idxBR = ((y + 1) * width + (x + 1)) * 4;
                
                // Calculate grayscale values
                const tl = 0.299 * imageData[idxTL] + 0.587 * imageData[idxTL + 1] + 0.114 * imageData[idxTL + 2];
                const tm = 0.299 * imageData[idxTM] + 0.587 * imageData[idxTM + 1] + 0.114 * imageData[idxTM + 2];
                const tr = 0.299 * imageData[idxTR] + 0.587 * imageData[idxTR + 1] + 0.114 * imageData[idxTR + 2];
                const ml = 0.299 * imageData[idxML] + 0.587 * imageData[idxML + 1] + 0.114 * imageData[idxML + 2];
                const mr = 0.299 * imageData[idxMR] + 0.587 * imageData[idxMR + 1] + 0.114 * imageData[idxMR + 2];
                const bl = 0.299 * imageData[idxBL] + 0.587 * imageData[idxBL + 1] + 0.114 * imageData[idxBL + 2];
                const bm = 0.299 * imageData[idxBM] + 0.587 * imageData[idxBM + 1] + 0.114 * imageData[idxBM + 2];
                const br = 0.299 * imageData[idxBR] + 0.587 * imageData[idxBR + 1] + 0.114 * imageData[idxBR + 2];
                
                // Sobel X gradient
                const sobelX = (tl + 2*tm + tr) - (bl + 2*bm + br);
                // Sobel Y gradient  
                const sobelY = (tl + 2*ml + bl) - (tr + 2*mr + br);
                
                // Edge magnitude
                const edgeMagnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY);
                
                // Threshold for edge detection
                if (edgeMagnitude > 30) {
                    edgeCount++;
                }
            }
        }
        
        const totalPixels = width * height;
        return edgeCount / totalPixels; // Edge density ratio
    }

    // Calculate texture score for context validation
    calculateTextureScore(imageData) {
        const width = Math.sqrt(imageData.length / 4);
        const height = width;
        let textureScore = 0;
        
        // Calculate Local Binary Pattern (LBP) for texture analysis
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const centerIdx = (y * width + x) * 4;
                const centerGray = 0.299 * imageData[centerIdx] + 
                                0.587 * imageData[centerIdx + 1] + 
                                0.114 * imageData[centerIdx + 2];
                
                let binaryPattern = 0;
                
                // Compare with 8 neighbors
                const neighbors = [
                    ((y - 1) * width + (x - 1)) * 4,  // top-left
                    ((y - 1) * width + x) * 4,        // top
                    ((y - 1) * width + (x + 1)) * 4,  // top-right
                    (y * width + (x - 1)) * 4,        // left
                    (y * width + (x + 1)) * 4,        // right
                    ((y + 1) * width + (x - 1)) * 4,  // bottom-left
                    ((y + 1) * width + x) * 4,        // bottom
                    ((y + 1) * width + (x + 1)) * 4   // bottom-right
                ];
                
                for (let i = 0; i < neighbors.length; i++) {
                    const neighborIdx = neighbors[i];
                    const neighborGray = 0.299 * imageData[neighborIdx] + 
                                      0.587 * imageData[neighborIdx + 1] + 
                                      0.114 * imageData[neighborIdx + 2];
                    
                    if (neighborGray >= centerGray) {
                        binaryPattern |= (1 << i);
                    }
                }
                
                // Count transitions in binary pattern (texture measure)
                let transitions = 0;
                for (let i = 0; i < 8; i++) {
                    const current = (binaryPattern >> i) & 1;
                    const next = (binaryPattern >> ((i + 1) % 8)) & 1;
                    if (current !== next) {
                        transitions++;
                    }
                }
                
                textureScore += transitions / 2.0; // Normalize
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        return textureScore / totalPixels; // Average texture complexity
    }

    // Calculate color uniformity for context validation
    calculateColorUniformity(imageData) {
        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = imageData.length / 4; // RGBA
        
        // Calculate mean values
        for (let i = 0; i < imageData.length; i += 4) {
            totalR += imageData[i];
            totalG += imageData[i + 1];
            totalB += imageData[i + 2];
        }
        
        const meanR = totalR / pixelCount;
        const meanG = totalG / pixelCount;
        const meanB = totalB / pixelCount;
        
        // Calculate standard deviations
        let stdDevR = 0, stdDevG = 0, stdDevB = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            stdDevR += Math.pow(imageData[i] - meanR, 2);
            stdDevG += Math.pow(imageData[i + 1] - meanG, 2);
            stdDevB += Math.pow(imageData[i + 2] - meanB, 2);
        }
        
        stdDevR = Math.sqrt(stdDevR / pixelCount);
        stdDevG = Math.sqrt(stdDevG / pixelCount);
        stdDevB = Math.sqrt(stdDevB / pixelCount);
        
        // Color uniformity is inverse of average standard deviation
        const avgStdDev = (stdDevR + stdDevG + stdDevB) / 3;
        const uniformity = 1.0 / (1.0 + avgStdDev); // Normalize to 0-1
        
        return uniformity;
    }
}

export default new TwoStageGateService();
