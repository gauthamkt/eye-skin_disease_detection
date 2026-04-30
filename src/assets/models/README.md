# TFLite Models

This directory contains the TensorFlow Lite models for disease detection.

## Required Models

### 1. Fundus Classifier Model
**Filename:** `fundus_classifier2.tflite`

**Description:** Binary classifier that distinguishes between fundus (retinal) and non-fundus images

**Expected Input:**
- Image size: 224x224 pixels
- Format: RGB
- Normalization: [0, 1] range

**Expected Output:**
- Binary classification labels:
  - Fundus
  - Non-Fundus

### 2. Skin Classifier Model
**Filename:** `skin_classifier.tflite` ⚠️ **MISSING**

**Description:** Binary classifier that distinguishes between skin and non-skin images

**Expected Input:**
- Image size: 224x224 pixels
- Format: RGB
- Normalization: [0, 1] range

**Expected Output:**
- Binary classification labels:
  - Skin
  - Non-Skin

**Status:** Currently missing - app will bypass skin validation until model is provided

### 3. Eye Disease Detection Model
**Filename:** `eye_disease_model.tflite`

**Description:** CNN model trained on the "mahnazarjmand/eye-diseases-classification" dataset

**Expected Input:**
- Image size: 224x224 pixels
- Format: RGB
- Normalization: [0, 1] range

**Expected Output:**
- Classification labels for retinal diseases:
  - Normal
  - Diabetic Retinopathy
  - Cataract
  - Glaucoma
  - Age-related Macular Degeneration
  - Hypertensive Retinopathy
  - Pathological Myopia
  - Other

### 4. Skin Disease Detection Model
**Filename:** `skin_disease_model_v2.tflite`

**Description:** CNN model trained on the "prathamjyotsingh/skin-disease" dataset

**Expected Input:**
- Image size: 224x224 pixels
- Format: RGB
- Normalization: [0, 255] range (no rescaling)

**Expected Output:**
- Classification labels for skin conditions:
  - Acne
  - Actinic Keratosis
  - Benign Tumors
  - Bullous
  - Candidiasis
  - Drug Eruption
  - Eczema
  - Infestations/Bites
  - Lichen
  - Lupus
  - Moles
  - Psoriasis
  - Rosacea
  - Seborrheic Keratoses
  - Skin Cancer
  - Sun/Sunlight Damage
  - Tinea
  - Unknown/Normal
  - Vascular Tumors
  - Vasculitis
  - Vitiligo
  - Warts

## How to Add Your Models

1. Once your models are trained and converted to TFLite format
2. Place them in this directory with the exact filenames mentioned above
3. Update the labels in `src/utils/constants.js` if your model outputs different classes
4. The app will automatically load and use these models

## Model Conversion

If you have Keras/TensorFlow models (.h5 or SavedModel format), convert them to TFLite:

```python
import tensorflow as tf

# Load your model
model = tf.keras.models.load_model('your_model.h5')

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Save the model
with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
```

## Training the Skin Classifier

To train the skin classifier, see the implementation guide in `SKIN_CLASSIFIER_IMPLEMENTATION.md`

## Current Status

✅ Fundus Classifier - Available and working
❌ Skin Classifier - Missing (app will bypass validation)
✅ Eye Disease Model - Available and working
✅ Skin Disease Model - Available and working
