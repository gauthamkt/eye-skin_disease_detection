import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ImageCapture from '../components/detection/ImageCapture';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ModelService from '../services/tflite/ModelService';
import DatabaseService from '../services/database/DatabaseService';
import { theme } from '../styles/theme';
import { globalStyles } from '../styles/globalStyles';
import { TEST_TYPES } from '../utils/constants';

const EyeDetectionScreen = ({ navigation }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const getDiseaseDescription = (disease, type) => {
        const descriptions = {
            eye: {
                'Cataract': 'Clouding of the eye\'s natural lens, causing vision problems.',
                'Diabetic Retinopathy': 'Diabetes-related damage to blood vessels in the retina.',
                'Glaucoma': 'Group of eye conditions that damage the optic nerve.',
                'Normal': 'No signs of eye disease detected in this image.'
            },
            skin: {
                'Atopic Dermatitis': 'Chronic inflammatory skin condition causing itching and redness.',
                'Basal Cell Carcinoma (BCC)': 'Most common type of skin cancer, rarely spreads.',
                'Benign Keratosis-like Lesions (BKL)': 'Non-cancerous skin growths and lesions.',
                'Eczema': 'Inflammatory skin condition causing dry, itchy patches.',
                'Melanocytic Nevi (NV)': 'Common moles, usually benign skin growths.',
                'Melanoma': 'Serious type of skin cancer that can spread to other organs.',
                'Psoriasis pictures Lichen Planus and related diseases': 'Autoimmune condition causing scaly patches.',
                'Seborrheic Keratoses and other Benign Tumors': 'Common non-cancerous skin growths.',
                'Tinea Ringworm Candidiasis and other Fungal Infections': 'Fungal infections affecting skin.',
                'Warts Molluscum and other Viral Infections': 'Viral infections causing skin lesions.'
            }
        };
        
        return descriptions[type]?.[disease] || 'Medical condition detected. Consult healthcare provider for details.';
    };

    const handleImageSelected = (image) => {
        setSelectedImage(image);
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (!selectedImage) {
            Alert.alert('No Image', 'Please capture or select an image first');
            return;
        }

        try {
            setAnalyzing(true);

            // Run model prediction with validation
            const prediction = await ModelService.predictEyeDisease(selectedImage.uri);

            // Check if validation passed before saving and showing results
            if (prediction.isValid) {
                // Save to database only for valid results
                const testId = await DatabaseService.saveTestResult({
                    testType: TEST_TYPES.EYE_DISEASE,
                    imagePath: selectedImage.uri,
                    prediction: prediction.topPrediction.label,
                    confidence: prediction.topPrediction.confidence,
                    allPredictions: prediction.allPredictions,
                });

                setResult({ ...prediction, testId });
            } else {
                // Set result without saving to database for invalid predictions
                setResult({ ...prediction, testId: null });
            }

        } catch (error) {
            Alert.alert('Error', 'Failed to analyze image: ' + error.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleViewHistory = () => {
        navigation.navigate('History', { testType: TEST_TYPES.EYE_DISEASE });
    };

    const handleReset = () => {
        setSelectedImage(null);
        setResult(null);
    };

    return (
        <LinearGradient
            colors={theme.gradients.background}
            style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                <Text style={styles.title}>Eye Disease Detection</Text>
                <Text style={styles.subtitle}>
                    Capture or upload a retinal image for analysis
                </Text>

                <ImageCapture onImageSelected={handleImageSelected} testType="EYE_DISEASE" />

                {selectedImage && !result && (
                    <Button
                        title="Analyze Image"
                        onPress={handleAnalyze}
                        variant="primary"
                        size="large"
                        loading={analyzing}
                        style={styles.analyzeButton}
                    />
                )}

                {analyzing && (
                    <Card variant="glass" style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                        <Text style={styles.loadingText}>Analyzing image...</Text>
                    </Card>
                )}

                {result && (
                    <Card variant="elevated" style={styles.resultCard}>
                        <Text style={styles.resultTitle}>Analysis Complete</Text>

                        {!result.isValid && (
                            <Card variant="glass" style={[
                                styles.warningCard,
                                result.validationStage === 0 ? styles.domainWarningCard :
                                result.validationStage === 1 ? styles.qualityWarningCard : styles.contentWarningCard
                            ]}>
                                <Text style={[
                                    styles.warningTitle,
                                    result.validationStage === 0 ? styles.domainWarningTitle :
                                    result.validationStage === 1 ? styles.qualityWarningTitle : styles.contentWarningTitle
                                ]}>
                                    {result.validationStage === 0 ? ' Domain Classification Failed' :
                                     result.validationStage === 1 ? 'ℹImage Quality Issues' : ' Content Validation Failed'}
                                </Text>
                                <Text style={styles.warningText}>{result.validationReason}</Text>
                                <Text style={styles.warningSubtext}>
                                    {result.validationStage === 0 
                                        ? 'This image appears to contain non-medical content. Please use clear retinal images for analysis.'
                                        : result.validationStage === 1 
                                        ? 'Please ensure your image has proper lighting, focus, and shows the relevant medical area.'
                                        : 'This image may not contain appropriate medical content. Please use clear retinal images.'
                                    }
                                </Text>
                                
                                {result.validation?.failures && (
                                    <View style={styles.failureList}>
                                        <Text style={styles.failureTitle}>Issues Found:</Text>
                                        {result.validation.failures.map((failure, index) => (
                                            <Text key={index} style={[
                                                styles.failureItem,
                                                result.validationStage === 0 ? styles.domainFailureItem :
                                                result.validationStage === 1 ? styles.qualityFailureItem : styles.contentFailureItem
                                            ]}>
                                                • {failure}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {result.validationStage === 0 && result.validation?.classification && (
                                    <View style={styles.domainDetails}>
                                        <Text style={styles.domainDetailsTitle}>Classification Details:</Text>
                                        <Text style={styles.domainDetailsText}>
                                            • Domain: {result.validation.classification.domain}
                                        </Text>
                                        <Text style={styles.domainDetailsText}>
                                            • Confidence: {(result.validation.classification.confidence * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                )}
                            </Card>
                        )}

                        <View style={styles.predictionContainer}>
                            <Text style={styles.predictionLabel}>Prediction:</Text>
                            <Text style={[
                                styles.predictionValue, 
                                !result.isValid && styles.invalidPrediction
                            ]}>
                                {result.topPrediction.label}
                            </Text>
                        </View>

                        {result.isValid && (
                            <View style={styles.confidenceContainer}>
                                <Text style={styles.confidenceLabel}>Confidence:</Text>
                                <Text style={[
                                    styles.confidenceValue,
                                    result.topPrediction.confidence < 0.5 && styles.lowConfidence
                                ]}>
                                    {(result.topPrediction.confidence * 100).toFixed(1)}%
                                </Text>
                            </View>
                        )}

                        {result.isValid && (
                            <View style={styles.confidenceBar}>
                                <View
                                    style={[
                                        styles.confidenceFill,
                                        { 
                                            width: `${result.topPrediction.confidence * 100}%`,
                                            backgroundColor: result.isValid ? 
                                                (result.topPrediction.confidence > 0.7 ? '#00E676' : '#FFD54F') : 
                                                '#FF5252'
                                        }
                                    ]}
                                />
                            </View>
                        )}

                        {result.isValid && (
                            <View style={styles.singlePredictionContainer}>
                                <Text style={styles.diseaseFoundLabel}>Disease Detected:</Text>
                                <Text style={styles.diseaseName}>{result.topPrediction.label}</Text>
                                <Text style={styles.diseaseDescription}>
                                    {getDiseaseDescription(result.topPrediction.label, 'eye')}
                                </Text>
                            </View>
                        )}

                        
                        <View style={styles.actionButtons}>
                            <Button
                                title="New Analysis"
                                onPress={handleReset}
                                variant="accent"
                                style={styles.actionButton}
                            />
                            <Button
                                title="View History"
                                onPress={handleViewHistory}
                                variant="primary"
                                style={styles.actionButton}
                            />
                        </View>
                    </Card>
                )}

            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    analyzeButton: {
        marginTop: theme.spacing.lg,
    },
    loadingCard: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
    },
    resultCard: {
        marginTop: theme.spacing.lg,
    },
    resultTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.success,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    predictionContainer: {
        marginBottom: theme.spacing.md,
    },
    predictionLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    predictionValue: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    confidenceContainer: {
        marginBottom: theme.spacing.sm,
    },
    confidenceLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    confidenceValue: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.accent,
    },
    confidenceBar: {
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    allPredictionsTitle: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    predictionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    predictionRowLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    predictionRowValue: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    actionButton: {
        flex: 1,
    },
    warningCard: {
        marginBottom: theme.spacing.lg,
        padding: theme.spacing.md,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)',
    },
    qualityWarningCard: {
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        borderColor: 'rgba(74, 144, 226, 0.3)',
    },
    contentWarningCard: {
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)',
    },
    warningTitle: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.error,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    qualityWarningTitle: {
        color: theme.colors.primary,
    },
    contentWarningTitle: {
        color: theme.colors.error,
    },
    domainWarningCard: {
        backgroundColor: 'rgba(255, 165, 0, 0.1)',  // Orange color for domain issues
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    domainWarningTitle: {
        color: '#FFA500',  // Orange color
    },
    domainFailureItem: {
        color: '#FFA500',  // Orange color
    },
    warningText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    warningSubtext: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    invalidPrediction: {
        color: theme.colors.error,
    },
    lowConfidence: {
        color: theme.colors.warning,
    },
    metadataContainer: {
        marginTop: theme.spacing.lg,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
    },
    metadataTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    metadataText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    failureList: {
        marginTop: theme.spacing.md,
    },
    failureTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    failureItem: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.error,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
    },
    qualityFailureItem: {
        color: theme.colors.primary,
    },
    contentFailureItem: {
        color: theme.colors.error,
    },
    singlePredictionContainer: {
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginVertical: theme.spacing.md,
    },
    diseaseFoundLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    diseaseName: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    confidenceText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.accent,
        fontWeight: '600',
    },
    diseaseDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: theme.typography.fontSize.sm * 1.4,
        marginTop: theme.spacing.sm,
        fontStyle: 'italic',
    },
    domainDetails: {
        marginTop: theme.spacing.md,
        padding: theme.spacing.sm,
        backgroundColor: 'rgba(255, 165, 0, 0.05)',
        borderRadius: theme.borderRadius.sm,
    },
    domainDetailsTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: '#FFA500',
        marginBottom: theme.spacing.xs,
    },
    domainDetailsText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
});

export default EyeDetectionScreen;
