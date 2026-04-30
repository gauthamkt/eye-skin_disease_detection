// Standard Ishihara test configuration
// Using 16 plates based on the user's provided files
export const ISHIHARA_PLATES = [
    {
        id: 1,
        image: require('../../assets/ishihara/8.png'),
        correctAnswer: '8',
        description: 'Plate 1'
    },
    {
        id: 2,
        image: require('../../assets/ishihara/6.png'),
        correctAnswer: '6',
        description: 'Plate 2'
    },
    {
        id: 3,
        image: require('../../assets/ishihara/29.png'),
        correctAnswer: '29',
        description: 'Plate 3'
    },
    {
        id: 4,
        image: require('../../assets/ishihara/5.png'),
        correctAnswer: '5',
        description: 'Plate 4'
    },
    {
        id: 5,
        image: require('../../assets/ishihara/3.png'),
        correctAnswer: '3',
        description: 'Plate 5'
    },
    {
        id: 6,
        image: require('../../assets/ishihara/15.png'),
        correctAnswer: '15',
        description: 'Plate 6'
    },
    {
        id: 7,
        image: require('../../assets/ishihara/74.png'),
        correctAnswer: '74',
        description: 'Plate 7'
    },
    {
        id: 8,
        image: require('../../assets/ishihara/2.png'),
        correctAnswer: '2',
        description: 'Plate 8'
    },
    {
        id: 9,
        image: require('../../assets/ishihara/97.png'),
        correctAnswer: '97',
        description: 'Plate 9'
    },
    {
        id: 10,
        image: require('../../assets/ishihara/45.png'),
        correctAnswer: '45',
        description: 'Plate 10'
    },
    {
        id: 11,
        image: require('../../assets/ishihara/7.png'),
        correctAnswer: '7',
        description: 'Plate 11'
    },
    {
        id: 12,
        image: require('../../assets/ishihara/16.png'),
        correctAnswer: '16',
        description: 'Plate 12'
    },
    {
        id: 13,
        image: require('../../assets/ishihara/73.png'),
        correctAnswer: '73',
        description: 'Plate 13'
    },
    {
        id: 14,
        image: require('../../assets/ishihara/26.png'),
        correctAnswer: '26',
        description: 'Plate 14'
    },
    {
        id: 15,
        image: require('../../assets/ishihara/42.png'),
        correctAnswer: '42',
        description: 'Plate 15'
    },
    {
        id: 16,
        image: require('../../assets/ishihara/35.png'),
        correctAnswer: '35',
        description: 'Plate 16'
    },
];

// Generate a random sequence of 10 plates for a test session
export const generateTestSequence = () => {
    // Clone the array to avoid modifying the original
    const allPlates = [...ISHIHARA_PLATES];

    // Fisher-Yates shuffle
    for (let i = allPlates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPlates[i], allPlates[j]] = [allPlates[j], allPlates[i]];
    }

    // Return first 10 plates
    return allPlates.slice(0, 10);
};

// Simple scoring analysis
export const analyzeColorBlindness = (answers) => {
    // Score all plates equally
    const correctCount = answers.filter(a => a.userAnswer === a.correctAnswer).length;
    const totalQuestions = answers.length;

    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    let severity = 'normal';
    let result = 'Normal Color Vision';
    let deficiencyType = 'None';

    // Adjusted thresholds for 10 random plates
    if (score >= 90) { // 9-10 correct
        severity = 'normal';
        result = 'Normal Color Vision';
        deficiencyType = 'Normal';
    } else if (score >= 70) { // 7-8 correct
        severity = 'mild';
        result = 'Mild Color Vision Deficiency';
        deficiencyType = 'Mild Deficiency';
    } else if (score >= 50) { // 5-6 correct
        severity = 'moderate';
        result = 'Moderate Color Vision Deficiency';
        deficiencyType = 'Moderate Deficiency';
    } else { // < 5 correct
        severity = 'severe';
        result = 'Significant Color Vision Deficiency';
        deficiencyType = 'Severe Deficiency';
    }

    return {
        score,
        severity,
        result,
        deficiencyType,
        protanScore: 0,
        deutanScore: 0,
        tritanScore: 0
    };
};
