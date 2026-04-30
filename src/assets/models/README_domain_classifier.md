# Domain Classifier Model

This directory should contain trained TFLite models for domain classification (medical vs non-medical images) with context awareness for eye vs skin analysis.

## Required Models

### Option 1: Single Context-Aware Model (Recommended)
**Filename:** `domain_classifier.tflite`

**Description:** CNN model trained to classify images into three categories:
- **Medical**: Valid medical images (retinal photos, skin conditions, etc.)
- **Non-medical**: Non-medical content (clothes, cars, objects, etc.)  
- **Uncertain**: Low quality or ambiguous images

### Option 2: Two Specialized Models (Alternative)
**Filenames:** 
- `eye_domain_classifier.tflite` (for eye disease detection)
- `skin_domain_classifier.tflite` (for skin disease detection)

**Description:** Specialized models for each analysis type:
- **Eye Model Classes**: ['eye_medical', 'eye_non_medical', 'eye_uncertain']
- **Skin Model Classes**: ['skin_medical', 'skin_non_medical', 'skin_uncertain']

## Model Specifications

### Single Model Approach
**Expected Input:**
- Image size: 224x224 pixels
- Format: RGB
- Normalization: [0, 1] range
- Channels: 3 (RGB)

**Expected Output:**
- Classification probabilities for 3 classes:
  - Index 0: Non-medical
  - Index 1: Medical  
  - Index 2: Uncertain

### Two-Model Approach
**Expected Input:** Same as single model
**Expected Output:**
- Eye model: 3 classes for eye-specific classification
- Skin model: 3 classes for skin-specific classification

## Training Data Recommendations

### Medical Images (Label: "Medical"):
**Eye Medical Images:**
- Retinal fundus photos (clear optic disc, blood vessels)
- Ophthalmology examination photos
- Proper lighting and focus on eye structures
- Typical aspect ratios: 0.8-1.5

**Skin Medical Images:**
- Dermatology examination photos
- Clear skin condition images
- Proper lighting and focus on skin areas
- Typical aspect ratios: 0.7-2.0

### Non-medical Images (Label: "Non-medical"):
**For Eye Context:**
- Clothing and fashion photos
- Cars, vehicles, machinery
- Nature and scenery
- General photography with aspect ratios >2.5 or <0.6

**For Skin Context:**
- Fashion and product photos
- Food and objects
- Extreme aspect ratios >3.0 or <0.5
- Overly uniform colors (designs, graphics)

### Uncertain Images (Label: "Uncertain"):
- Very dark or overexposed photos
- Blurry or out-of-focus images
- Low resolution images
- Extreme close-ups or far shots
- Poor lighting conditions

## Training Approach

### 1. Data Collection Strategy

#### Recommended Public Datasets:

##### Medical Images:
**Eye Medical Images:**
- **DRIVE Dataset**: https://drive.grand-challenge.org/
  - Retinal fundus photos with diabetic retinopathy grading
  - 10,000+ high-quality retinal images
  - Download: `git clone https://github.com/GoogleDrive/dataset`

- **EyeQ**: https://github.com/ncbi/EyeQ
  - Various eye conditions and normal cases
  - Quality-graded retinal images

- **APTOS Dataset**: https://github.com/medap/APTOS
  - Anterior segment optical coherence tomography
  - Macular hole, epiretinal membrane, etc.

**Skin Medical Images:**
- **HAM10000**: https://github.com/ham1000
  - 10,000+ dermatoscopic images
  - 7 disease categories + benign lesions
  - Download: `pip install ham1000`

- **ISIC Archive**: https://www.isic-archive.com/
  - Skin lesion images with melanoma labels
  - 25,000+ images across multiple collections
  - Download: API access or bulk download

- **DermNet**: https://github.com/visual-disease-detection/DermNet
  - 2,000+ dermatology images
  - Multiple skin condition categories

##### Non-Medical Images:
**General Image Datasets:**
- **COCO Dataset**: https://cocodataset.org/
  - 330,000+ diverse images (people, cars, objects)
  - Download: `pip install pycocotools`

- **ImageNet**: https://www.image-net.org/
  - 1.2M+ images across 1000 categories
  - Download: `pip install torchvision`

- **Open Images**: https://github.com/openimages
  - 9M+ images with detailed annotations
  - Includes vehicles, clothing, objects

**Fashion-Specific:**
- **Fashion-MNIST**: https://github.com/zalandoresearch/fashion-mnist
  - 70,000+ clothing item images
  - Download: `pip install tensorflow-datasets`

- **DeepFashion**: https://github.com/switchablenabets/DeepFashion2
  - High-resolution clothing images
  - Multiple categories and poses

#### Dataset Organization:
```python
# Create organized dataset structure
dataset/
├── medical/
│   ├── eye_medical/
│   │   ├── fundus/
│   │   ├── retina_scans/
│   │   └── optic_disc/
│   └── skin_medical/
│       ├── lesions/
│       ├── rashes/
│       └── conditions/
├── non_medical/
│   ├── clothing/
│   ├── vehicles/
│   ├── objects/
│   └── nature/
└── uncertain/
    ├── blurry/
    ├── dark/
    └── low_resolution/
```

#### Single Context-Aware Model:
```python
# Dataset composition
dataset = {
    'medical': {
        'eye_medical': 2000,      # Retinal photos from DRIVE/EyeQ
        'skin_medical': 2000,      # Skin conditions from HAM10000/ISIC
        'general_medical': 1000    # Other medical images
    },
    'non_medical': {
        'clothing': 1500,          # From Fashion-MNIST/DeepFashion
        'vehicles': 1000,           # From COCO/ImageNet
        'objects': 1000,            # From COCO/ImageNet
        'nature': 1000,             # From ImageNet/Open Images
        'graphics': 500              # Generated/design images
    },
    'uncertain': {
        'blurry': 500,              # Artificially blurred images
        'dark': 300,                # Underexposed images
        'low_res': 200,             # Small images
        'overexposed': 200           # Overexposed images
    }
}

# Total: ~11,000 images
# Split: 80% training, 20% validation
```

#### Two-Model Approach:
```python
# Eye domain model dataset
eye_dataset = {
    'eye_medical': 3000,      # Retinal photos from DRIVE/EyeQ/APTOS
    'eye_non_medical': 2000,  # Non-eye content from COCO/Fashion
    'eye_uncertain': 500        # Poor quality eye images
}

# Skin domain model dataset  
skin_dataset = {
    'skin_medical': 3000,      # Skin conditions from HAM10000/ISIC/DermNet
    'skin_non_medical': 2000,  # Non-skin content from COCO/Fashion
    'skin_uncertain': 500        # Poor quality skin images
}
```

#### Data Download Scripts:
```python
# Download and prepare datasets
import os
import requests
from PIL import Image
import numpy as np

def download_ham1000():
    """Download HAM10000 dataset"""
    url = "https://github.com/dicelab/HAM10000/raw/master/HAM10000_images.tar.gz"
    response = requests.get(url, stream=True)
    
    with open('HAM10000_images.tar.gz', 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    # Extract and organize
    os.system('tar -xzf HAM10000_images.tar.gz')
    organize_medical_images('HAM10000_images/', 'skin_medical')

def download_drive():
    """Download DRIVE retinal dataset"""
    # Download from official source
    os.system('wget https://drive.grand-challenge.org/DRIVE.zip')
    os.system('unzip DRIVE.zip')
    organize_medical_images('DRIVE/training/', 'eye_medical')

def download_coco():
    """Download COCO dataset for non-medical images"""
    os.system('git clone https://github.com/cocodataset/cocoapi')
    # Extract specific categories for non-medical content
    extract_coco_categories(['person', 'car', 'truck'], 'non_medical')

def organize_medical_images(source_dir, target_category):
    """Organize medical images by category"""
    # Implementation for sorting medical images
    pass
```

#### Data Augmentation Configuration:
```python
# Enhanced augmentation for medical images
datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    rotation_range=25,
    width_shift_range=0.15,
    height_shift_range=0.15,
    shear_range=0.1,
    zoom_range=0.2,
    horizontal_flip=True,
    vertical_flip=False,  # Don't flip medical images vertically
    brightness_range=[0.8, 1.2],
    channel_shift_range=0.1,
    fill_mode='nearest'
)

# Different augmentation for non-medical images
non_medical_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    rotation_range=45,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.3,
    horizontal_flip=True,
    vertical_flip=True,  # Can flip non-medical images
    brightness_range=[0.5, 1.5],
    channel_shift_range=0.2
)
```

### 2. Model Architecture (Recommended)

#### Single Context-Aware Model:
```python
import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    tf.keras.layers.MaxPooling2D((2, 2)),
    tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
    tf.keras.layers.MaxPooling2D((2, 2)),
    tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
    tf.keras.layers.MaxPooling2D((2, 2)),
    tf.keras.layers.Conv2D(256, (3, 3), activation='relu'),
    tf.keras.layers.MaxPooling2D((2, 2)),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(512, activation='relu'),
    tf.keras.layers.Dropout(0.5),
    tf.keras.layers.Dense(3, activation='softmax')  # 3 output classes
])
```

#### Two-Model Approach:
```python
# Same architecture for both models
def create_domain_model():
    return tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(3, activation='softmax')  # 3 output classes
    ])

eye_model = create_domain_model()
skin_model = create_domain_model()
```

### 3. Training Configuration

#### Single Model Training:
```python
model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Data augmentation for robustness
datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True,
    zoom_range=0.2,
    brightness_range=[0.8, 1.2]
)

# Train with early stopping
early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_accuracy',
    patience=8,
    restore_best_weights=True,
    min_delta=0.001
)

history = model.fit(
    train_dataset,
    epochs=60,
    validation_data=val_dataset,
    callbacks=[early_stopping]
)
```

#### Two-Model Training:
```python
# Train eye model
eye_model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
eye_history = eye_model.fit(eye_train_dataset, epochs=50, validation_data=eye_val_dataset)

# Train skin model  
skin_model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
skin_history = skin_model.fit(skin_train_dataset, epochs=50, validation_data=skin_val_dataset)
```

## Model Conversion

### Single Model:
```python
import tensorflow as tf

# Load your trained model
model = tf.keras.models.load_model('domain_classifier.h5')

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

# Save model
with open('domain_classifier.tflite', 'wb') as f:
    f.write(tflite_model)
```

### Two-Model:
```python
# Convert eye model
eye_converter = tf.lite.TFLiteConverter.from_keras_model(eye_model)
eye_tflite = eye_converter.convert()
with open('eye_domain_classifier.tflite', 'wb') as f:
    f.write(eye_tflite)

# Convert skin model
skin_converter = tf.lite.TFLiteConverter.from_keras_model(skin_model)
skin_tflite = skin_converter.convert()
with open('skin_domain_classifier.tflite', 'wb') as f:
    f.write(skin_tflite)
```

## Convert Existing H5 Models to TFLite

If you already have trained H5 models for eye/skin disease classification, you can convert them to TFLite:

#### Single Context-Aware Model:
```python
import tensorflow as tf

# Load your existing H5 model
model = tf.keras.models.load_model('your_domain_classifier.h5')

# Convert to TFLite with optimizations
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]  # For mobile compatibility
converter.inference_input_type = tf.float32  # Better performance on mobile
converter.allow_custom_ops = True  # If you used custom layers

# Convert model
tflite_model = converter.convert()

# Save TFLite model
with open('domain_classifier.tflite', 'wb') as f:
    f.write(tflite_model)

print("Model converted successfully!")
print(f"Model size: {len(tflite_model)} bytes")
```

#### Two Specialized Models:
```python
# Convert eye domain classifier
eye_converter = tf.lite.TFLiteConverter.from_keras_model('eye_domain_classifier.h5')
eye_tflite = eye_converter.convert()
with open('eye_domain_classifier.tflite', 'wb') as f:
    f.write(eye_tflite)

# Convert skin domain classifier  
skin_converter = tf.lite.TFLiteConverter.from_keras_model('skin_domain_classifier.h5')
skin_tflite = skin_converter.convert()
with open('skin_domain_classifier.tflite', 'wb') as f:
    f.write(skin_tflite)

print("Both models converted successfully!")
```

### Advanced Conversion Options:
```python
# For better mobile performance
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [
    tf.lite.Optimize.DEFAULT,
    tf.lite.Optimize.EXPERIMENTAL_SPARSITY  # Smaller model size
]
converter.representative_dataset = "your_training_data"  # Better quantization
converter.target_spec.supported_types = [tf.float16]  # Half precision

# Post-training quantization (for even smaller models)
def quantize_model(tflite_path):
    """Apply post-training quantization"""
    converter = tf.lite.TFLiteConverter.from_saved_model(tflite_path)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = "calibration_dataset.npy"
    
    # Full integer quantization (8-bit)
    quantized_model = converter.convert()
    
    with open('quantized_domain_classifier.tflite', 'wb') as f:
        f.write(quantized_model)
    
    return quantized_model
```

### Model Size Comparison:
| Model Type | Original H5 | TFLite (FP32) | TFLite (INT8) | Size Reduction |
|-------------|---------------|-------------------|-------------------|-------------------|
| Single Model | ~15MB | ~4-6MB | ~1-2MB | 85-90% |
| Eye Model | ~12MB | ~3-4MB | ~0.8-1.5MB | 85-90% |
| Skin Model | ~12MB | ~3-4MB | ~0.8-1.5MB | 85-90% |

### Deployment Strategy:
```python
# Choose best model for deployment
def select_best_model():
    models = {
        'single': 'domain_classifier.tflite',
        'eye_specialized': 'eye_domain_classifier.tflite', 
        'skin_specialized': 'skin_domain_classifier.tflite'
    }
    
    # Check file sizes and availability
    available_models = {}
    for name, path in models.items():
        if os.path.exists(path):
            size = os.path.getsize(path)
            available_models[name] = {'path': path, 'size': size}
    
    # Selection priority
    if 'single' in available_models:
        return models['single']  # Best accuracy
    elif 'eye_specialized' in available_models:
        return models['eye_specialized']  # Best for eye context
    elif 'skin_specialized' in available_models:
        return models['skin_specialized']  # Best for skin context
    else:
        return None  # No models available
```

## Integration

### Single Model Integration:
```javascript
import DomainModelService from '../services/tflite/DomainModelService';

// Classify with context awareness
const classification = await DomainModelService.classifyDomain(imageUri, 'eye');  // or 'skin'

if (classification.isValid && classification.context === 'eye') {
    // Proceed with eye analysis
} else {
    // Show context rejection warning
}
```

### Two-Model Integration:
```javascript
// Load appropriate model based on context
const eyeModel = await loadTensorflowModel(require('../../assets/models/eye_domain_classifier.tflite'));
const skinModel = await loadTensorflowModel(require('../../assets/models/skin_domain_classifier.tflite'));

// Use context-specific model
const model = analysisType === 'eye' ? eyeModel : skinModel;
const classification = await classifyWithModel(model, imageUri);
```

## Performance Expectations

### Single Model:
- **Accuracy**: >90% on validation set
- **Inference Time**: <100ms on mobile devices
- **Model Size**: ~4-6MB (after optimization)
- **Memory Usage**: <60MB RAM

### Two-Model:
- **Accuracy**: >92% on validation set (specialized models)
- **Inference Time**: <80ms on mobile devices
- **Model Size**: ~3-4MB each (smaller specialized models)
- **Memory Usage**: <50MB RAM

## Context-Aware Features

### Eye Context Validation:
- **Aspect Ratio**: 0.6 - 2.0 (retinal photos)
- **Color Variance**: >60 (blood vessels, optic disc)
- **Edge Density**: >0.05 (retinal structures)
- **Brightness**: 0.2 - 0.8 (proper retinal lighting)

### Skin Context Validation:
- **Aspect Ratio**: 0.7 - 3.0 (skin examination)
- **Color Variance**: >80 (skin conditions, lesions)
- **Edge Density**: >0.03 (skin texture details)
- **Brightness**: 0.25 - 0.85 (proper skin lighting)

## Testing

### Test Cases for Single Model:
```javascript
const testImages = [
    { path: 'retinal_photo.jpg', expected: { domain: 'medical', context: 'eye' } },
    { path: 'skin_condition.jpg', expected: { domain: 'medical', context: 'skin' } },
    { path: 'car_photo.jpg', expected: { domain: 'non-medical' } },
    { path: 'clothing.jpg', expected: { domain: 'non-medical' } },
    { path: 'blurry_photo.jpg', expected: { domain: 'uncertain' } }
];

for (const test of testImages) {
    const result = await DomainModelService.classifyDomain(test.path);
    console.log(`${test.path}: ${result.domain} (${result.confidence.toFixed(2)})`);
}
```

### Cross-Contamination Tests:
```javascript
// Test that skin images are rejected by eye analysis
const eyeResult = await DomainModelService.classifyDomain('skin_photo.jpg', 'eye');
console.log('Eye analysis of skin image:', eyeResult.isValid); // Should be false

// Test that eye images are rejected by skin analysis  
const skinResult = await DomainModelService.classifyDomain('retinal_photo.jpg', 'skin');
console.log('Skin analysis of eye image:', skinResult.isValid); // Should be false
```

## Fallback

If TFLite models are not available, the system automatically falls back to:
1. **Heuristic domain classification** (rule-based)
2. **Context-aware validation** (aspect ratio, color variance, etc.)
3. **Cross-contamination prevention** (eye vs skin validation)

## Deployment

### File Structure:
```
src/assets/models/
├── domain_classifier.tflite              # Single context-aware model
├── eye_domain_classifier.tflite          # Alternative: Eye-specific model
├── skin_domain_classifier.tflite          # Alternative: Skin-specific model
└── README_domain_classifier.md           # This file
```

### Model Selection:
The system automatically selects the best available approach:
1. **Primary**: Single context-aware model (if available)
2. **Alternative**: Two specialized models (if available)
3. **Fallback**: Heuristic classification (always available)

This ensures robust domain classification with cross-contamination prevention for both eye and skin disease detection.
