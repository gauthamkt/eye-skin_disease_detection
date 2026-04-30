/**
 * Domain Classifier Service
 * Distinguishes between medical and non-medical images using heuristic analysis
 * and pattern recognition techniques
 */

import * as FileSystem from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';

class DomainClassifierService {
    constructor() {
        this.thresholds = {
            medicalScore: 0.6,      // Minimum score to be considered medical
            skinToneRange: { min: 0.15, max: 0.85 },  // Expected skin tone ranges
            eyeColorRange: { min: 0.1, max: 0.9 },     // Expected eye image ranges
            textureComplexity: 0.3,  // Minimum texture complexity for medical
            colorHarmony: 0.4,       // Maximum color harmony (non-medical images are often too harmonious)
            aspectRatioMedical: { min: 0.5, max: 2.5 },  // Medical image aspect ratios
        };
    }

    /**
     * Classify image domain (medical vs non-medical)
     */
    async classifyDomain(imageUri, expectedType = 'medical') {
        try {
            console.log('Domain classification started for:', imageUri);
            
            // Load and analyze image
            const imageFeatures = await this.extractImageFeatures(imageUri);
            console.log('Image features extracted:', {
                aspectRatio: imageFeatures.aspectRatio,
                brightness: imageFeatures.brightness,
                textureScore: imageFeatures.textureScore,
                colorUniformity: imageFeatures.colorUniformity,
                edgeDensity: imageFeatures.edgeDensity
            });
            
            // Calculate domain scores
            const scores = {
                medical: this.calculateMedicalScore(imageFeatures),
                nonMedical: this.calculateNonMedicalScore(imageFeatures),
                quality: this.calculateQualityScore(imageFeatures),
                texture: this.calculateTextureScore(imageFeatures),
                color: this.calculateColorScore(imageFeatures),
                composition: this.calculateCompositionScore(imageFeatures)
            };
            
            console.log('Domain scores calculated:', scores);
            
            // Determine final classification
            const classification = this.makeClassification(scores, expectedType);
            
            console.log('Domain classification result:', classification);
            
            return classification;
            
        } catch (error) {
            console.error('Domain classification failed:', error);
            return {
                domain: 'unknown',
                confidence: 0,
                reason: `Classification error: ${error.message}`,
                scores: {}
            };
        }
    }

    /**
     * Extract comprehensive image features
     */
    async extractImageFeatures(imageUri) {
        const base64Data = await FileSystem.readFile(imageUri, 'base64');
        const arrayBuffer = decode(base64Data);
        const uint8Array = new Uint8Array(arrayBuffer);
        const decodedData = jpeg.decode(uint8Array, { useTArray: true });
        
        const { width, height, data } = decodedData;
        const pixelCount = width * height;
        
        // Sample pixels for analysis (every 5th pixel for performance)
        const sampleRate = 5;
        const sampleCount = Math.floor(pixelCount / (sampleRate * sampleRate));
        
        let totalR = 0, totalG = 0, totalB = 0;
        let edgeCount = 0;
        let textureVariance = 0;
        let colorHistogram = new Array(16).fill(0); // 16-bin color histogram
        
        for (let i = 0; i < pixelCount; i += sampleRate * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Color accumulation
            totalR += r;
            totalG += g;
            totalB += b;
            
            // Color histogram (simplified)
            const bin = Math.floor((r + g + b) / 3 / 16);
            colorHistogram[Math.min(bin, 15)]++;
            
            // Edge detection (simplified)
            if (i > 0 && i < pixelCount - sampleRate * 4) {
                const nextR = data[i + sampleRate * 4];
                const diff = Math.abs(r - nextR);
                if (diff > 20) edgeCount++;
            }
            
            // Texture analysis (local variance)
            if (i > sampleRate * 4 && i < pixelCount - sampleRate * 4) {
                const prevR = data[i - sampleRate * 4];
                const nextR = data[i + sampleRate * 4];
                const localVariance = Math.abs((prevR + nextR) / 2 - r);
                textureVariance += localVariance;
            }
        }
        
        const actualSamples = sampleCount || 1;
        const avgR = totalR / actualSamples;
        const avgG = totalG / actualSamples;
        const avgB = totalB / actualSamples;
        const avgBrightness = (avgR + avgG + avgB) / 3;
        
        // Normalize histogram
        const normalizedHistogram = colorHistogram.map(count => count / actualSamples);
        
        // Calculate color distribution metrics
        const colorVariance = this.calculateColorVariance(normalizedHistogram);
        const colorDominance = Math.max(...normalizedHistogram);
        const colorUniformity = this.calculateColorUniformity(normalizedHistogram);
        
        return {
            dimensions: { width, height },
            aspectRatio: width / height,
            brightness: avgBrightness / 255,
            colors: { avgR, avgG, avgB },
            edgeDensity: edgeCount / actualSamples,
            textureScore: textureVariance / actualSamples,
            colorHistogram: normalizedHistogram,
            colorVariance,
            colorDominance,
            colorUniformity,
            pixelCount
        };
    }

    /**
     * Calculate medical domain score
     */
    calculateMedicalScore(features) {
        let score = 0.5; // Base score
        
        // Aspect ratio check (medical images often have specific ratios)
        if (features.aspectRatio >= this.thresholds.aspectRatioMedical.min && 
            features.aspectRatio <= this.thresholds.aspectRatioMedical.max) {
            score += 0.15;
        }
        
        // Texture complexity (medical images have complex textures)
        if (features.textureScore > this.thresholds.textureComplexity) {
            score += 0.2;
        }
        
        // Color distribution (medical images less color-harmonious)
        if (features.colorUniformity < this.thresholds.colorHarmony) {
            score += 0.1;
        }
        
        // Edge density (medical images often have more edges)
        if (features.edgeDensity > 0.05) {
            score += 0.1;
        }
        
        // Brightness range (medical images have specific brightness ranges)
        if (features.brightness >= 0.2 && features.brightness <= 0.8) {
            score += 0.1;
        }
        
        // Color variance (medical images have diverse colors)
        if (features.colorVariance > 0.3) {
            score += 0.1;
        }
        
        // Resolution check (medical images usually have sufficient resolution)
        if (features.dimensions.width >= 300 && features.dimensions.height >= 300) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Calculate non-medical domain score
     */
    calculateNonMedicalScore(features) {
        let score = 0.4; // Lower base score (more likely to be medical)
        
        // Too perfect color harmony (often indicates non-medical/design images)
        if (features.colorUniformity > 0.6) {
            score += 0.25; // Increased from 0.2
        }
        
        // Very low texture (simple graphics, illustrations)
        if (features.textureScore < 0.08) {  // Increased from 0.1
            score += 0.2; // Increased from 0.15
        }
        
        // Unusual aspect ratios (banners, logos, etc.)
        if (features.aspectRatio > 2.5 || features.aspectRatio < 0.4) {  // Stricter
            score += 0.2; // Increased from 0.15
        }
        
        // Very high color dominance (single dominant color)
        if (features.colorDominance > 0.35) {  // Lowered from 0.4
            score += 0.15; // Increased from 0.1
        }
        
        // Very low edge density (simple graphics)
        if (features.edgeDensity < 0.03) {  // Increased from 0.02
            score += 0.15; // Increased from 0.1
        }
        
        // Extreme brightness (over/under exposed non-medical photos)
        if (features.brightness < 0.15 || features.brightness > 0.85) {  // Stricter
            score += 0.15; // Increased from 0.1
        }
        
        // Additional check: Very low color variance (monochrome or simple colors)
        if (features.colorVariance < 0.2) {
            score += 0.1;
        }
        
        // Additional check: Perfect aspect ratios (designed images)
        if (Math.abs(features.aspectRatio - 1.0) < 0.1 || Math.abs(features.aspectRatio - 16/9) < 0.1) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Calculate image quality score
     */
    calculateQualityScore(features) {
        let score = 0.5;
        
        // Brightness quality
        if (features.brightness >= 0.3 && features.brightness <= 0.7) {
            score += 0.2;
        }
        
        // Resolution quality
        if (features.dimensions.width >= 400 && features.dimensions.height >= 400) {
            score += 0.2;
        }
        
        // Texture quality
        if (features.textureScore >= 0.05 && features.textureScore <= 0.5) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Calculate texture score
     */
    calculateTextureScore(features) {
        return Math.min(features.textureScore * 2, 1.0); // Normalize to 0-1
    }

    /**
     * Calculate color score
     */
    calculateColorScore(features) {
        return 1.0 - features.colorUniformity; // Higher is better for medical
    }

    /**
     * Calculate composition score
     */
    calculateCompositionScore(features) {
        let score = 0.5;
        
        // Aspect ratio score
        if (features.aspectRatio >= 0.7 && features.aspectRatio <= 1.5) {
            score += 0.3;
        }
        
        // Resolution score
        const minDimension = Math.min(features.dimensions.width, features.dimensions.height);
        if (minDimension >= 500) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Make final classification decision
     */
    makeClassification(scores, expectedType) {
        const medicalScore = scores.medical;
        const nonMedicalScore = scores.nonMedical;
        const qualityScore = scores.quality;
        
        // Weighted decision
        const finalMedicalScore = (medicalScore * 0.6) + (qualityScore * 0.2) + (scores.texture * 0.1) + (scores.composition * 0.1);
        const finalNonMedicalScore = (nonMedicalScore * 0.7) + (1 - qualityScore) * 0.3;
        
        console.log('Final scores calculation:', {
            finalMedical: finalMedicalScore,
            finalNonMedical: finalNonMedicalScore,
            medicalOriginal: medicalScore,
            nonMedicalOriginal: nonMedicalScore
        });
        
        // Determine domain
        let domain, confidence, reason;
        
        if (finalNonMedicalScore > finalMedicalScore && finalNonMedicalScore > 0.6) {
            domain = 'non-medical';
            confidence = finalNonMedicalScore;
            reason = 'Image characteristics strongly indicate non-medical content';
        } else if (finalMedicalScore > finalNonMedicalScore && finalMedicalScore > 0.5) {
            domain = 'medical';
            confidence = finalMedicalScore;
            reason = 'Image characteristics match medical domain patterns';
        } else {
            domain = 'uncertain';
            confidence = Math.max(finalMedicalScore, finalNonMedicalScore);
            reason = 'Unable to confidently determine image domain';
        }
        
        console.log('Domain decision made:', { domain, confidence, reason });
        
        return {
            domain,
            confidence,
            reason,
            scores: {
                ...scores,
                finalMedical: finalMedicalScore,
                finalNonMedical: finalNonMedicalScore
            },
            isMedical: domain === 'medical',
            isValid: domain === 'medical' && confidence > this.thresholds.medicalScore
        };
    }

    /**
     * Helper methods for color analysis
     */
    calculateColorVariance(histogram) {
        const mean = histogram.reduce((sum, val) => sum + val, 0) / histogram.length;
        const variance = histogram.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / histogram.length;
        return variance;
    }

    calculateColorUniformity(histogram) {
        // Gini coefficient for color uniformity
        const sorted = [...histogram].sort((a, b) => a - b);
        const n = sorted.length;
        const cumulative = sorted.reduce((sum, val, i) => sum + val * (i + 1), 0);
        const total = sorted.reduce((sum, val) => sum + val, 0);
        return total > 0 ? (2 * cumulative) / (n * total) - (n + 1) / n : 0;
    }
}

export default new DomainClassifierService();
