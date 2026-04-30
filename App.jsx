import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import DatabaseService from './src/services/database/DatabaseService';
import ModelService from './src/services/tflite/ModelService';
import { theme } from './src/styles/theme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import EyeDetectionScreen from './src/screens/EyeDetectionScreen';
import SkinDetectionScreen from './src/screens/SkinDetectionScreen';
import ColorVisionTestScreen from './src/screens/ColorVisionTestScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createStackNavigator();

const App = () => {
    useEffect(() => {
        // Initialize database on app start
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // Initialize database
            await DatabaseService.init();
            console.log('Database initialized');

            // Initialize TensorFlow and models
            await ModelService.init();
            console.log('TensorFlow models initialized');

            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            // App can still function with database only
            // Models will be loaded on-demand if initialization fails
        }
    };

    return (
        <>
            <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.background}
            />
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: theme.colors.backgroundLight,
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        headerTintColor: theme.colors.textPrimary,
                        headerTitleStyle: {
                            fontWeight: 'bold',
                            fontSize: theme.typography.fontSize.lg,
                        },
                        cardStyle: {
                            backgroundColor: theme.colors.background,
                        },
                    }}>
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{
                            title: 'EyeDetect',
                            headerShown: true,
                        }}
                    />
                    <Stack.Screen
                        name="EyeDetection"
                        component={EyeDetectionScreen}
                        options={{
                            title: 'Eye Disease Detection',
                        }}
                    />
                    <Stack.Screen
                        name="SkinDetection"
                        component={SkinDetectionScreen}
                        options={{
                            title: 'Skin Disease Detection',
                        }}
                    />
                    <Stack.Screen
                        name="ColorVisionTest"
                        component={ColorVisionTestScreen}
                        options={{
                            title: 'Color Vision Test',
                        }}
                    />
                    <Stack.Screen
                        name="History"
                        component={HistoryScreen}
                        options={{
                            title: 'Test History',
                        }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
};

export default App;
