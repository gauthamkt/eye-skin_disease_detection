/**
 * Image Validation Utilities
 * Provides guidance and validation for medical image analysis
 */

export const IMAGE_GUIDELINES = {
    EYE_DISEASE: {
        title: 'Eye Disease Detection',
        description: 'Valid images should show clear retinal images',
        validExamples: [
            'Clear retinal fundus photos',
            'Well-lit eye examination images',
            'Focused retina with visible blood vessels',
            'Standard ophthalmology imaging format'
        ],
        invalidExamples: [
            'General face photos',
            'External eye photos (conjunctiva, cornea)',
            'Clothing, objects, or scenery',
            'Blurry or dark images',
            'Non-medical images'
        ],
        tips: [
            'Use proper retinal imaging equipment',
            'Ensure good lighting and focus',
            'Avoid external eye photos',
            'Images should show the retina/fundus'
        ]
    },
    SKIN_DISEASE: {
        title: 'Skin Disease Detection',
        description: 'Valid images should show clear skin conditions',
        validExamples: [
            'Clear close-up photos of skin lesions',
            'Well-lit skin condition images',
            'Rashes, moles, or abnormal skin areas',
            'Dermatology examination photos'
        ],
        invalidExamples: [
            'Clothing, fabric, or fashion photos',
            'General body photos without specific conditions',
            'Objects, scenery, or animals',
            'Blurry or distant skin images'
        ],
        tips: [
            'Focus on the specific skin area of concern',
            'Use good, even lighting',
            'Include some surrounding normal skin for context',
            'Avoid filters or heavy editing'
        ]
    }
};

export const getValidationGuidelines = (testType) => {
    return IMAGE_GUIDELINES[testType] || null;
};

export const isValidImageType = (fileName, mimeType) => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    const hasValidExtension = validExtensions.some(ext => 
        fileName.toLowerCase().endsWith(ext)
    );
    const hasValidMimeType = validMimeTypes.includes(mimeType);
    
    return hasValidExtension && hasValidMimeType;
};

export const generateUserFriendlyMessage = (validationResult) => {
    if (validationResult.isValid) {
        return {
            type: 'success',
            title: ' Image Valid',
            message: 'This image appears suitable for analysis.'
        };
    }
    
    const messages = {
        'Low confidence - image may not contain relevant medical content': {
            type: 'warning',
            title: ' Image Type Not Recognized',
            message: 'This doesn\'t appear to be a medical image. Please use clear retinal or skin photos for accurate results.'
        },
        'Uncertain prediction - image may not be clear enough for analysis': {
            type: 'warning',
            title: ' Image Quality Issues',
            message: 'The image is unclear or low quality. Please use a well-lit, focused image for better results.'
        },
        'High uncertainty - image type not recognized': {
            type: 'error',
            title: ' Invalid Image Type',
            message: 'This image type cannot be analyzed. Please use appropriate medical images (retinal for eye detection, skin photos for skin analysis).'
        },
        'No predictions generated': {
            type: 'error',
            title: ' Analysis Failed',
            message: 'Unable to analyze this image. Please try with a different image.'
        }
    };
    
    return messages[validationResult.reason] || {
        type: 'warning',
        title: ' Validation Issue',
        message: validationResult.reason
    };
};
