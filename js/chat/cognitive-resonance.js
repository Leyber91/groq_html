import { applyQuantumInspiredProcessing } from '../config/moa-config.js';

export function cognitiveResonanceChamber(insights) {
    const processedInsights = applyQuantumInspiredProcessing(insights);
    return analyzeEmergentPatterns(processedInsights);
}

function analyzeEmergentPatterns(insights) {
    // Simple clustering based on word frequency
    const wordFrequency = {};
    insights.forEach(insight => {
        const words = insight.toLowerCase().split(/\W+/);
        words.forEach(word => {
            if (word.length > 3) { // Ignore short words
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        });
    });

    // Find the most common words
    const commonWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);

    // Generate a summary based on common words
    return `Emergent patterns revolve around concepts: ${commonWords.join(', ')}`;
}