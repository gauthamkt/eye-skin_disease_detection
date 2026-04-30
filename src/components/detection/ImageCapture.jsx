import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import CameraService from '../../services/camera/CameraService';
import Button from '../common/Button';
import Card from '../common/Card';
import { theme } from '../../styles/theme';
import { getValidationGuidelines } from '../../utils/imageValidation';

const ImageCapture = ({ onImageSelected, testType }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);

    const handleCameraCapture = async () => {
        try {
            setLoading(true);
            const image = await CameraService.capturePhoto();
            if (image) {
                setSelectedImage(image);
                onImageSelected(image);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to capture image: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGallerySelect = async () => {
        try {
            setLoading(true);
            const image = await CameraService.selectFromGallery();
            if (image) {
                setSelectedImage(image);
                onImageSelected(image);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select image: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRetake = () => {
        setSelectedImage(null);
        onImageSelected(null);
    };

    const guidelines = getValidationGuidelines(testType);

    return (
        <Card variant="glass" style={styles.container}>
            {selectedImage ? (
                <View>
                    <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                    />
                    <Button
                        title="Retake Photo"
                        onPress={handleRetake}
                        variant="accent"
                        size="small"
                        style={styles.retakeButton}
                    />
                </View>
            ) : (
                <View>
                    <Text style={styles.title}>Select Image</Text>
                    <Text style={styles.description}>
                        Choose an image from your gallery for analysis
                    </Text>

                    <Button
                        title="Choose from Gallery"
                        onPress={handleGallerySelect}
                        variant="primary"
                        loading={loading}
                        style={styles.button}
                    />

                    {guidelines && (
                        <View>
                            <TouchableOpacity
                                onPress={() => setShowGuidelines(!showGuidelines)}
                                style={styles.guidelineToggle}
                            >
                                <Text style={styles.guidelineToggleText}>
                                    {showGuidelines ? '▼' : '▶'} Image Guidelines
                                </Text>
                            </TouchableOpacity>

                            {showGuidelines && (
                                <ScrollView style={styles.guidelinesContainer}>
                                    <Text style={styles.guidelineTitle}>{guidelines.title}</Text>
                                    <Text style={styles.guidelineDescription}>{guidelines.description}</Text>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}> Valid Images:</Text>
                                        {guidelines.validExamples.map((example, index) => (
                                            <Text key={index} style={styles.bulletPoint}>• {example}</Text>
                                        ))}
                                    </View>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>❌ Invalid Images:</Text>
                                        {guidelines.invalidExamples.map((example, index) => (
                                            <Text key={index} style={styles.bulletPointInvalid}>• {example}</Text>
                                        ))}
                                    </View>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>💡 Tips:</Text>
                                        {guidelines.tips.map((tip, index) => (
                                            <Text key={index} style={styles.bulletPoint}>• {tip}</Text>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    description: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    buttonContainer: {
        gap: theme.spacing.md,
    },
    button: {
        marginBottom: theme.spacing.sm,
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    retakeButton: {
        marginTop: theme.spacing.sm,
    },
    guidelineToggle: {
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    guidelineToggleText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.accent,
        fontWeight: '600',
    },
    guidelinesContainer: {
        maxHeight: 300,
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
    },
    guidelineTitle: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    guidelineDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    bulletPoint: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
    },
    bulletPointInvalid: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.error,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
    },
});

export default ImageCapture;
