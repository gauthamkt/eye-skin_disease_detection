import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { ISHIHARA_PLATES, analyzeColorBlindness, generateTestSequence } from '../services/colortest/IshiharaTestService';
import DatabaseService from '../services/database/DatabaseService';
import { theme } from '../styles/theme';
import { globalStyles } from '../styles/globalStyles';
import { TextInput } from 'react-native';

const ColorVisionTestScreen = ({ navigation }) => {
    const [currentPlateIndex, setCurrentPlateIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [answers, setAnswers] = useState([]);
    const [testStartTime, setTestStartTime] = useState(null);
    const [testComplete, setTestComplete] = useState(false);
    const [result, setResult] = useState(null);

    const [testPlates, setTestPlates] = useState([]);

    useEffect(() => {
        startTest();
    }, []);

    const startTest = () => {
        const plates = generateTestSequence();
        setTestPlates(plates);
        setCurrentPlateIndex(0);
        setUserAnswer('');
        setAnswers([]);
        setTestStartTime(Date.now());
        setTestComplete(false);
        setResult(null);
    };

    const handleSubmitAnswer = () => {
        if (!userAnswer.trim()) {
            Alert.alert('No Answer', 'Please enter what you see');
            return;
        }

        const currentPlate = testPlates[currentPlateIndex];
        const isCorrect = userAnswer.trim() === currentPlate.correctAnswer;

        const newAnswers = [
            ...answers,
            {
                plateId: currentPlate.id,
                userAnswer: userAnswer.trim(),
                correctAnswer: currentPlate.correctAnswer,
                isCorrect,
            },
        ];

        setAnswers(newAnswers);
        setUserAnswer('');

        if (currentPlateIndex < testPlates.length - 1) {
            setCurrentPlateIndex(currentPlateIndex + 1);
        } else {
            // Test complete
            finishTest(newAnswers);
        }
    };

    const finishTest = async (finalAnswers) => {
        const testDuration = Math.floor((Date.now() - testStartTime) / 1000);

        // Analyze results using the new service
        const analysis = analyzeColorBlindness(finalAnswers);

        try {
            // Save to database
            await DatabaseService.saveColorVisionTest({
                totalQuestions: testPlates.length,
                correctAnswers: finalAnswers.filter(a => a.isCorrect).length,
                score: (finalAnswers.filter(a => a.isCorrect).length / testPlates.length) * 100,
                result: analysis.deficiencyType,
                testDuration,
                answers: finalAnswers,
                protanScore: analysis.protanScore,
                deutanScore: analysis.deutanScore,
                tritanScore: analysis.tritanScore,
                deficiencyType: analysis.deficiencyType,
                severity: analysis.severity
            });

            setResult({
                ...analysis,
                testDuration,
                correctCount: finalAnswers.filter(a => a.isCorrect).length,
                totalQuestions: testPlates.length
            });
            setTestComplete(true);
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save test results');
        }
    };

    const handleRestart = () => {
        startTest();
    };

    const handleViewHistory = () => {
        navigation.navigate('History', { testType: 'color_vision' });
    };

    if (testComplete && result) {
        return (
            <LinearGradient
                colors={theme.gradients.background}
                style={globalStyles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>

                    <Card variant="glass" style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>Analysis Complete</Text>
                            <Text style={styles.resultDuration}>
                                Duration: {Math.floor(result.testDuration / 60)}:
                                {(result.testDuration % 60).toString().padStart(2, '0')}
                            </Text>
                        </View>

                        <ResultPieChart
                            correct={result.correctCount || 0}
                            total={result.totalQuestions || 10}
                        />

                        <View style={[styles.diagnosisContainer, styles[result.severity]]}>
                            <Text style={styles.diagnosisTitle}>{result.deficiencyType}</Text>
                            <Text style={styles.diagnosisDescription}>{result.result}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <Button
                                title="Retake Test"
                                onPress={handleRestart}
                                variant="outlined"
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

                </ScrollView>
            </LinearGradient>
        );
    }

    if (testPlates.length === 0) return null;

    const currentPlate = testPlates[currentPlateIndex];

    return (
        <LinearGradient
            colors={theme.gradients.background}
            style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                <Text style={styles.title}>Color Vision Test</Text>
                <Text style={styles.subtitle}>
                    Plate {currentPlateIndex + 1} of {testPlates.length}
                </Text>

                <Card variant="glass" style={styles.plateCard}>
                    <Text style={styles.instruction}>
                        What number do you see in the circle?
                    </Text>

                    {/* Image will show placeholer until actual Ishihara plates are added */}
                    <View style={styles.plateImageContainer}>
                        {currentPlate.image ? (
                            <Image
                                source={currentPlate.image}
                                style={styles.plateImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.placeholderPlate}>
                                <Text style={styles.placeholderText}>
                                    Ishihara Plate {currentPlate.id}
                                </Text>
                                <Text style={styles.placeholderSubtext}>
                                    (Image not found)
                                </Text>
                            </View>
                        )}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter the number"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={userAnswer}
                        onChangeText={setUserAnswer}
                        keyboardType="number-pad"
                        maxLength={3}
                    />

                    <Button
                        title="Submit Answer"
                        onPress={handleSubmitAnswer}
                        variant="primary"
                        size="large"
                    />
                </Card>

                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${((currentPlateIndex + 1) / testPlates.length) * 100}%` },
                        ]}
                    />
                </View>

            </ScrollView>
        </LinearGradient>
    );
};

const getSeverityColor = (severity) => {
    switch (severity) {
        case 'normal':
            return theme.colors.success;
        case 'mild':
            return theme.colors.warning;
        case 'moderate':
            return theme.colors.error;
        case 'severe':
            return theme.colors.error;
        default:
            return theme.colors.textSecondary;
    }
};

const ResultPieChart = ({ correct, total, size = 160 }) => {
    const radius = size / 2;
    const strokeWidth = 15;
    const center = size / 2;
    const circleRadius = radius - strokeWidth;
    const circumference = 2 * Math.PI * circleRadius;
    const correctPercentage = total > 0 ? correct / total : 0;
    const correctStrokeDashoffset = circumference - (circumference * correctPercentage);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                    {/* Background Circle (Total/Incorrect base) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={circleRadius}
                        stroke={theme.colors.error}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {/* Foreground Circle (Correct) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={circleRadius}
                        stroke={theme.colors.success}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={correctStrokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </G>
                <SvgText
                    x={center}
                    y={center}
                    fill={theme.colors.textPrimary}
                    fontSize="28"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                >
                    {Math.round(correctPercentage * 100)}%
                </SvgText>
            </Svg>
            <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.success, marginRight: 6 }} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Correct: {correct}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.error, marginRight: 6 }} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Incorrect: {total - correct}</Text>
                </View>
            </View>
        </View>
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
    plateCard: {
        alignItems: 'center',
    },
    instruction: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    plateImageContainer: {
        width: 300,
        height: 300,
        marginBottom: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plateImage: {
        width: '100%',
        height: '100%',
    },
    placeholderPlate: {
        width: '100%',
        height: '100%',
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    placeholderText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    placeholderSubtext: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
    input: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    progressBar: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        marginTop: theme.spacing.xl,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    resultCard: {
        marginTop: theme.spacing.lg,
    },
    resultTitle: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.success,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    scoreLabel: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    scoreValue: {
        fontSize: theme.typography.fontSize.xxxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    scorePercentage: {
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.accent,
        marginTop: theme.spacing.xs,
    },
    interpretationCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        borderLeftWidth: 4,
        marginBottom: theme.spacing.lg,
    },
    interpretationResult: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    interpretationDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.fontSize.sm * 1.5,
    },
    durationText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    resultHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    resultDuration: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    diagnosisContainer: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.xl,
        borderLeftWidth: 4,
        borderColor: theme.colors.primary,
    },
    normal: {
        borderColor: theme.colors.success,
    },
    mild: {
        borderColor: theme.colors.warning,
    },
    moderate: {
        borderColor: theme.colors.error,
    },
    severe: {
        borderColor: theme.colors.error,
    },
    diagnosisTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    diagnosisDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});

export default ColorVisionTestScreen;
