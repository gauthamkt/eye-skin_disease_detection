import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/common/Card';
import DatabaseService from '../services/database/DatabaseService';
import { theme } from '../styles/theme';
import { globalStyles } from '../styles/globalStyles';
import { TEST_TYPES } from '../utils/constants';

const HistoryScreen = ({ route, navigation }) => {
    const [testResults, setTestResults] = useState([]);
    const [colorVisionTests, setColorVisionTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState(route?.params?.testType || 'all');

    useEffect(() => {
        loadHistory();
    }, [selectedFilter]);

    const loadHistory = async () => {
        try {
            setLoading(true);

            if (selectedFilter === 'all' || selectedFilter !== TEST_TYPES.COLOR_VISION) {
                const results = await DatabaseService.getAllTestResults(
                    selectedFilter === 'all' ? null : selectedFilter
                );
                setTestResults(results);
            }

            if (selectedFilter === 'all' || selectedFilter === TEST_TYPES.COLOR_VISION) {
                const cvTests = await DatabaseService.getAllColorVisionTests();
                setColorVisionTests(cvTests);
            }

        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTest = async (id, testType) => {
        Alert.alert(
            'Delete Test',
            'Are you sure you want to delete this test result?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (testType === TEST_TYPES.COLOR_VISION) {
                                await DatabaseService.deleteColorVisionTest(id);
                            } else {
                                await DatabaseService.deleteTestResult(id);
                            }
                            await loadHistory();
                        } catch (error) {
                            console.error('Error deleting test:', error);
                            Alert.alert('Error', 'Failed to delete test result');
                        }
                    },
                },
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All History',
            'Are you sure you want to delete all test results? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await DatabaseService.clearAllHistory();
                            await loadHistory();
                        } catch (error) {
                            console.error('Error clearing history:', error);
                            Alert.alert('Error', 'Failed to clear history');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const renderTestResult = ({ item }) => (
        <Card variant="glass" style={styles.historyItem}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ResultDetails', { testId: item.id })}
                style={styles.historyContent}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>
                        {item.test_type === TEST_TYPES.EYE_DISEASE ? 'Eye' : 'Skin'}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                </View>

                <Text style={styles.historyPrediction}>{item.prediction}</Text>
                <View style={styles.confidenceBar}>
                    <View
                        style={[
                            styles.confidenceFill,
                            { width: `${item.confidence * 100}%` },
                        ]}
                    />
                </View>
                <Text style={styles.confidenceText}>
                    Confidence: {(item.confidence * 100).toFixed(1)}%
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTest(item.id, item.test_type)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </Card>
    );

    const renderColorVisionTest = ({ item }) => (
        <Card variant="glass" style={styles.historyItem}>
            <View style={styles.historyContent}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>Color Vision</Text>
                    <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                </View>

                <Text style={styles.historyPrediction}>{item.result}</Text>
                <Text style={styles.scoreText}>
                    Score: {item.correct_answers}/{item.total_questions} ({item.score.toFixed(0)}%)
                </Text>
            </View>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTest(item.id, TEST_TYPES.COLOR_VISION)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </Card>
    );

    const filters = [
        { id: 'all', label: 'All Tests' },
        { id: TEST_TYPES.EYE_DISEASE, label: 'Eye' },
        { id: TEST_TYPES.SKIN_DISEASE, label: 'Skin' },
        { id: TEST_TYPES.COLOR_VISION, label: 'Color Vision' },
    ];

    return (
        <LinearGradient
            colors={theme.gradients.background}
            style={globalStyles.container}>

            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}>
                    {filters.map((filter) => (
                        <TouchableOpacity
                            key={filter.id}
                            onPress={() => setSelectedFilter(filter.id)}
                            style={[
                                styles.filterButton,
                                selectedFilter === filter.id && styles.filterButtonActive,
                            ]}>
                            <Text
                                style={[
                                    styles.filterText,
                                    selectedFilter === filter.id && styles.filterTextActive,
                                ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Test History</Text>
                    {(testResults.length > 0 || colorVisionTests.length > 0) && (
                        <TouchableOpacity
                            style={styles.clearAllButton}
                            onPress={handleClearAll}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <Text style={styles.loadingText}>Loading...</Text>
                ) : (
                    <>
                        {(selectedFilter === 'all' || selectedFilter !== TEST_TYPES.COLOR_VISION) &&
                            testResults.length > 0 && (
                                <FlatList
                                    data={testResults}
                                    renderItem={renderTestResult}
                                    keyExtractor={(item) => item.id.toString()}
                                    scrollEnabled={false}
                                />
                            )}

                        {(selectedFilter === 'all' || selectedFilter === TEST_TYPES.COLOR_VISION) &&
                            colorVisionTests.length > 0 && (
                                <FlatList
                                    data={colorVisionTests}
                                    renderItem={renderColorVisionTest}
                                    keyExtractor={(item) => item.id.toString()}
                                    scrollEnabled={false}
                                />
                            )}

                        {testResults.length === 0 && colorVisionTests.length === 0 && (
                            <Card variant="glass" style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No test results yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Start by taking a test from the home screen
                                </Text>
                            </Card>
                        )}
                    </>
                )}

            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    filterContainer: {
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterScroll: {
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    filterButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surface,
    },
    filterButtonActive: {
        backgroundColor: theme.colors.accent,
    },
    filterText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    filterTextActive: {
        color: theme.colors.textPrimary,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    clearAllButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
    },
    clearAllText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    loadingText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    },
    historyItem: {
        marginBottom: theme.spacing.md,
    },
    historyContent: {
        flex: 1,
    },
    deleteButton: {
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
        alignSelf: 'flex-end',
    },
    deleteButtonText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    historyType: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    historyDate: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textTertiary,
    },
    historyPrediction: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    confidenceBar: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        marginBottom: theme.spacing.xs,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    confidenceText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    scoreText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    emptyCard: {
        alignItems: 'center',
        padding: theme.spacing.xxl,
        marginTop: theme.spacing.xl,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

export default HistoryScreen;
