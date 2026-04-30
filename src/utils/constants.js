// App constants
export const APP_NAME = 'EyeDetect';

// Model configurations
export const MODELS = {
    FUNDUS_CLASSIFIER: {
        name: 'fundus_classifier2.tflite',
        inputSize: 224,
        labels: ['Fundus', 'Non-Fundus'],  // SWAPPED to match training order
        rescale: true,
    },
    SKIN_CLASSIFIER: {
        name: 'skin_classifier.tflite',
        inputSize: 224,
        labels: ['Skin', 'Non-Skin'],
        rescale: true,
    },
    EYE_DISEASE: {
        name: 'eye_disease_model.tflite',
        inputSize: 224,
        labels: [
            'Cataract',
            'Diabetic Retinopathy',
            'Glaucoma',
            'Normal',
        ],
        rescale: true, // Eye model uses 0-1
    },
    SKIN_DISEASE: {
        name: 'skin_disease_model_optimized.tflite',  // New optimized model
        inputSize: 224,
        labels: [
            'Acne',
            'Actinic Keratosis',
            'Benign Tumors',
            'Bullous',
            'Candidiasis',
            'Drug Eruption',
            'Eczema',
            'Infestations/Bites',
            'Lichen',
            'Lupus',
            'Moles',
            'Psoriasis',
            'Rosacea',
            'Seborrheic Keratoses',
            'Skin Cancer',
            'Sun/Sunlight Damage',
            'Tinea',
            'Unknown/Normal',
            'Vascular Tumors',
            'Vasculitis',
            'Vitiligo',
            'Warts'
        ],
        rescale: false, // Skin model uses 0-255 scaling
    },
};

// Color vision test configuration
export const ISHIHARA_TEST = {
    totalPlates: 10,
    timePerPlate: 5, // seconds
    passingScore: 7, // minimum correct answers
};

// Database configuration
export const DB_CONFIG = {
    name: 'eyedetect.db',
    location: 'default',
};

// Test types
export const TEST_TYPES = {
    EYE_DISEASE: 'eye_disease',
    SKIN_DISEASE: 'skin_disease',
    COLOR_VISION: 'color_vision',
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLD = {
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.3,
};

// Image processing
export const IMAGE_CONFIG = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'JPEG',
};

// Export formats
export const EXPORT_FORMATS = {
    PDF: 'pdf',
    JSON: 'json',
};
