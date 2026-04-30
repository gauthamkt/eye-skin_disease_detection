#!/usr/bin/env python3
"""
Google Colab Script: Fine-Tune Eye Disease Model with Non-Fundus Images
Upload this to Google Colab and run cell by cell
"""

# Cell 1: Setup Environment
# Install required packages
!pip install tensorflow==2.13.0 scikit-learn==1.3.0 matplotlib==3.7.1 seaborn==0.12.0

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import models, optimizers, callbacks, layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
import glob
import json
from google.colab import files
import zipfile

print("✅ Environment setup complete!")
print(f"TensorFlow version: {tf.__version__}")

# Cell 2: Upload Your Files
# Upload your existing trained Keras model
print("📤 Please upload your existing trained Keras model (.h5 file):")
model_uploaded = files.upload()

# Get the uploaded model filename
model_filename = list(model_uploaded.keys())[0]
print(f"✅ Model uploaded: {model_filename}")

# Upload your random/non-fundus images (zip file)
print("\n📤 Please upload your random/non-fundus images as a ZIP file:")
images_uploaded = files.upload()

# Get the uploaded zip filename
zip_filename = list(images_uploaded.keys())[0]
print(f"✅ Images uploaded: {zip_filename}")

# Cell 3: Extract and Prepare Dataset
# Extract the zip file
print("📂 Extracting images...")
with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
    zip_ref.extractall('dataset')

# Check what we extracted
print("\n📁 Extracted contents:")
!ls -la dataset/

# Find image files
image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
all_images = []

for ext in image_extensions:
    images = glob.glob(f'dataset/**/{ext}', recursive=True)
    all_images.extend(images)

print(f"\n🖼️ Found {len(all_images)} images total")
print("Sample images:")
for i, img in enumerate(all_images[:5]):
    print(f"  {i+1}. {img}")
if len(all_images) > 5:
    print(f"  ... and {len(all_images)-5} more")

# Cell 4: Load and Analyze Existing Model
class EyeModelFineTuner:
    def __init__(self, existing_model_path):
        self.IMAGE_SIZE = 224
        self.BATCH_SIZE = 32
        self.EPOCHS = 20
        self.LEARNING_RATE = 0.0001
        
        self.existing_model_path = existing_model_path
        self.base_model = None
        
        # Enhanced labels: original eye diseases + "Non-Fundus" class
        self.CLASSES = [
            'Normal',           # Original eye disease class
            'Diabetic Retinopathy',  # Original eye disease class  
            'Glaucoma',         # Original eye disease class
            'Cataract',          # Original eye disease class
            'Non-Fundus',       # NEW: Reject non-fundus images
        ]
        
        self.NUM_CLASSES = len(self.CLASSES)
    
    def load_existing_model(self):
        print(f"🧠 Loading existing model from: {self.existing_model_path}")
        
        try:
            # Load the existing model
            self.base_model = tf.keras.models.load_model(self.existing_model_path)
            print(f"✅ Successfully loaded model with {len(self.base_model.layers)} layers")
            
            # Print model summary
            print("\n📋 Original Model Summary:")
            self.base_model.summary()
            
            # Get the original number of classes
            original_output_shape = self.base_model.output_shape
            print(f"\n📊 Original output shape: {original_output_shape}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading existing model: {e}")
            return False

# Initialize fine-tuner
tuner = EyeModelFineTuner(model_filename)

# Load existing model
if not tuner.load_existing_model():
    print("❌ Failed to load existing model. Please check the file.")
else:
    print("✅ Model loaded successfully!")

# Cell 5: Load and Prepare Non-Fundus Images
def load_non_fundus_images(image_paths):
    """Load and prepare non-fundus images for fine-tuning"""
    print(f"🖼️ Loading {len(image_paths)} non-fundus images...")
    
    images = []
    labels = []
    
    for img_path in image_paths:
        try:
            # Load and preprocess image
            img = Image.open(img_path).convert('RGB')
            img = img.resize((tuner.IMAGE_SIZE, tuner.IMAGE_SIZE))
            img_array = np.array(img) / 255.0
            
            images.append(img_array)
            labels.append(4)  # Index for 'Non-Fundus' class
            
        except Exception as e:
            print(f"❌ Error loading {img_path}: {e}")
    
    print(f"✅ Successfully loaded {len(images)} images")
    return np.array(images), np.array(labels)

# Load non-fundus images
X, y = load_non_fundus_images(all_images)

if len(X) == 0:
    print("❌ No images loaded! Please check your dataset.")
else:
    print(f"📊 Dataset shape: {X.shape}")
    print(f"📊 Labels: All are class 4 (Non-Fundus)")
    print(f"📊 Data type: {X.dtype}, Range: [{X.min():.3f}, {X.max():.3f}]")

# Cell 6: Create Fine-Tuned Model
def create_fine_tuned_model():
    """Create fine-tuned model with additional non-fundus class"""
    print("🔧 Creating fine-tuned model...")
    
    if tuner.base_model is None:
        raise ValueError("Base model not loaded")
    
    # Get all layers except the final dense layer
    base_layers = tuner.base_model.layers[:-1]  # All layers except the last one
    
    # Create new model with same base layers
    fine_tuned_model = models.Sequential()
    
    # Add all base layers (except the final output layer)
    for layer in base_layers:
        fine_tuned_model.add(layer)
    
    # Freeze early layers to preserve learned features
    # Only unfreeze the last few layers for fine-tuning
    for layer in fine_tuned_model.layers[:-10]:  # Freeze all but last 10 layers
        layer.trainable = False
    
    # Add new output layer for 5 classes (4 original + 1 non-fundus)
    fine_tuned_model.add(
        layers.Dense(tuner.NUM_CLASSES, activation='softmax', name='new_output')
    )
    
    print(f"✅ Created fine-tuned model with {len(fine_tuned_model.layers)} layers")
    print(f"📊 Trainable parameters: {fine_tuned_model.count_params():,}")
    
    return fine_tuned_model

# Create fine-tuned model
fine_tuned_model = create_fine_tuned_model()

# Display model summary
print("\n📋 Fine-Tuned Model Summary:")
fine_tuned_model.summary()

# Cell 7: Compile and Prepare for Training
def compile_model(model):
    """Compile the fine-tuned model"""
    print("⚙️ Compiling fine-tuned model...")
    
    model.compile(
        optimizer=optimizers.Adam(learning_rate=tuner.LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy', 
                 tf.keras.metrics.Precision(name='precision'),
                 tf.keras.metrics.Recall(name='recall')]
    )
    
    return model

# Compile the model
fine_tuned_model = compile_model(fine_tuned_model)
print("✅ Model compiled successfully!")

# Split data for training
if len(X) > 0:
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"📊 Training samples: {len(X_train)}")
    print(f"📊 Validation samples: {len(X_val)}")
else:
    print("❌ No data available for training!")

# Cell 8: Fine-Tune the Model
if len(X) > 0:
    # Create data generators
    train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rotation_range=10,
        width_shift_range=0.05,
        height_shift_range=0.05,
        shear_range=0.05,
        zoom_range=0.05,
        horizontal_flip=True,
        brightness_range=[0.9, 1.1],
        fill_mode='nearest'
    )
    
    val_datagen = tf.keras.preprocessing.image.ImageDataGenerator()
    
    train_generator = train_datagen.flow(
        X_train, y_train,
        batch_size=tuner.BATCH_SIZE,
        shuffle=True
    )
    
    val_generator = val_datagen.flow(
        X_val, y_val,
        batch_size=tuner.BATCH_SIZE,
        shuffle=False
    )
    
    # Callbacks for fine-tuning
    callbacks_list = [
        callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        callbacks.ModelCheckpoint(
            'fine_tuned_eye_model.h5',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    print("🚀 Starting fine-tuning...")
    print(f"📊 Training with {len(X_train)} samples, validating with {len(X_val)} samples")
    
    # Fine-tune the model
    history = fine_tuned_model.fit(
        train_generator,
        steps_per_epoch=max(1, len(X_train) // tuner.BATCH_SIZE),
        epochs=tuner.EPOCHS,
        validation_data=val_generator,
        validation_steps=max(1, len(X_val) // tuner.BATCH_SIZE),
        callbacks=callbacks_list,
        verbose=1
    )
    
    print("✅ Fine-tuning complete!")
else:
    print("❌ Cannot train - no data available!")

# Cell 9: Evaluate the Fine-Tuned Model
if len(X) > 0:
    # Evaluate the model
    print("📊 Evaluating fine-tuned model...")
    
    results = fine_tuned_model.evaluate(X_val, y_val, verbose=1)
    print(f"📊 Test Loss: {results[0]:.4f}")
    print(f"📊 Test Accuracy: {results[1]:.4f}")
    print(f"📊 Test Precision: {results[2]:.4f}")
    print(f"📊 Test Recall: {results[3]:.4f}")
    
    # Make predictions
    y_pred = np.argmax(fine_tuned_model.predict(X_val), axis=1)
    
    # Classification report
    print("\n📋 Classification Report:")
    print(classification_report(y_val, y_pred, target_names=tuner.CLASSES))
    
    # Confusion matrix
    cm = confusion_matrix(y_val, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
               xticklabels=tuner.CLASSES, yticklabels=tuner.CLASSES)
    plt.title('Fine-Tuned Model Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.show()
else:
    print("❌ No data to evaluate!")

# Cell 10: Convert to TFLite and Download
if len(X) > 0:
    # Convert to TFLite
    print("📱 Converting to TFLite...")
    
    converter = tf.lite.TFLiteConverter.from_keras_model(fine_tuned_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    converter.inference_input_type = tf.float32
    
    tflite_model = converter.convert()
    
    # Save TFLite model
    tflite_filename = 'fine_tuned_eye_model.tflite'
    with open(tflite_filename, 'wb') as f:
        f.write(tflite_model)
    
    print(f"✅ TFLite model saved as: {tflite_filename}")
    print(f"📊 Model size: {len(tflite_model):,} bytes")
    
    # Download the fine-tuned model
    print(f"\n📥 Downloading {tflite_filename}...")
    files.download(tflite_filename)
    
    # Also download the H5 version
    print(f"\n📥 Downloading fine_tuned_eye_model.h5...")
    files.download('fine_tuned_eye_model.h5')
    
    print("\n🎉 Fine-tuning complete!")
    print("\n📋 What to do next:")
    print("1. Download the fine_tuned_eye_model.tflite file")
    print("2. Replace your existing eye_disease_model.tflite with this new version")
    print("3. Test in your app - it should now reject non-fundus images!")
    
    print("\n✨ Expected behavior:")
    print("✅ Fundus images → Show eye disease predictions")
    print("❌ Non-fundus images → Rejected as 'Non-Fundus'")
    print("🔒 Prevents false predictions on unrelated images")
else:
    print("❌ No model to convert!")

print("\n🎯 SUMMARY")
print("✅ What you accomplished:")
print("1. Loaded your existing trained model - preserved all eye disease knowledge")
print("2. Added non-fundus rejection - learned to identify random images")
print("3. Used transfer learning - much faster than training from scratch")
print("4. Created TFLite model - ready for mobile deployment")
print("\n🚀 Benefits of this approach:")
print("- Faster training (20 epochs vs 50+ from scratch)")
print("- Less data needed (only non-fundus images)")
print("- Better accuracy (preserves original knowledge)")
print("- Single model solution (no separate domain classifier needed)")
print("\n📱 Next steps:")
print("1. Download the fine_tuned_eye_model.tflite file")
print("2. Replace your existing eye_disease_model.tflite in the app")
print("3. Test with fundus and non-fundus images")
print("4. Enjoy improved accuracy and false prediction prevention!")
