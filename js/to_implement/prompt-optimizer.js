// Import necessary modules
import { KeywordExtractor } from './keyword-extractor.js';
import { SentimentAnalyzer } from './sentiment-analyzer.js';

export class PromptOptimizer {
    constructor() {
        this.promptHistory = [];
        this.maxHistorySize = 100;
        this.keywordExtractor = new KeywordExtractor();
        this.sentimentAnalyzer = new SentimentAnalyzer();
    }

    async optimizePrompts(input, output) {
        this.addToHistory(input, output);
        const effectiveness = await this.analyzeEffectiveness(input, output);
        const suggestions = this.generateSuggestions(effectiveness);
        const optimizedPrompt = await this.applyOptimizations(input, suggestions);
        
        console.log('Prompt Optimization Suggestions:', suggestions);
        console.log('Optimized Prompt:', optimizedPrompt);
        
        return optimizedPrompt;
    }

    addToHistory({ input, output }) {
        this.promptHistory.push({ input, output, timestamp: Date.now() });
        if (this.promptHistory.length > this.maxHistorySize) {
            this.promptHistory.shift();
        }
    }

    async analyzeEffectiveness(input, output) {
        const metrics = {
            lengthRatio: this.calculateLengthRatio(input, output),
            keywordRelevance: await this.keywordExtractor.analyzeRelevance(input, output),
            sentimentMatch: await this.sentimentAnalyzer.compareSentiment(input, output),
            coherence: this.analyzeCoherence(output),
            specificity: this.analyzeSpecificity(input)
        };

        return this.calculateOverallEffectiveness(metrics);
    }

    calculateLengthRatio(input, output) {
        return output.length / input.length;
    }

    analyzeCoherence(output) {
        const sentences = output.split('.');
        return sentences.length > 1 ? 'high' : 'low';
    }

    analyzeSpecificity(input) {
        const specificWords = ['exactly', 'precisely', 'specifically', 'in particular'];
        return specificWords.some(word => input.toLowerCase().includes(word)) ? 'high' : 'low';
    }

    calculateOverallEffectiveness(metrics) {
        const { lengthRatio, keywordRelevance, sentimentMatch, coherence, specificity } = metrics;
        let score = 0;

        score += lengthRatio > 1.5 ? 2 : (lengthRatio > 1 ? 1 : 0);
        score += keywordRelevance === 'high' ? 2 : (keywordRelevance === 'medium' ? 1 : 0);
        score += sentimentMatch === 'high' ? 2 : (sentimentMatch === 'medium' ? 1 : 0);
        score += coherence === 'high' ? 2 : 0;
        score += specificity === 'high' ? 2 : 0;

        return score >= 8 ? 'high' : (score >= 5 ? 'medium' : 'low');
    }

    generateSuggestions(effectiveness) {
        const suggestions = {
            high: [
                'The prompt is highly effective. Consider fine-tuning for specific use cases.',
                'Experiment with more challenging or nuanced queries to push the boundaries.'
            ],
            medium: [
                'Add more context or background information to the prompt.',
                'Include specific examples or scenarios to guide the model\'s response.',
                'Use more precise language or technical terms if appropriate.'
            ],
            low: [
                'Rephrase the prompt to be more clear and concise.',
                'Break down complex queries into smaller, more manageable parts.',
                'Provide explicit instructions on the desired format or content of the response.',
                'Remove any ambiguous or vague language from the prompt.'
            ]
        };

        return suggestions[effectiveness] || suggestions.low;
    }

    async applyOptimizations(input, suggestions) {
        let optimizedPrompt = input;

        for (const suggestion of suggestions) {
            optimizedPrompt = await this.applySuggestion(optimizedPrompt, suggestion);
        }

        return optimizedPrompt;
    }

    async applySuggestion(prompt, suggestion) {
        // In a real implementation, this could use AI to apply the suggestion
        // For now, we'll just append the suggestion to the prompt
        return `${prompt}\n\nSuggestion: ${suggestion}`;
    }
}
