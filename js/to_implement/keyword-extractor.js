export class KeywordExtractor {
    constructor() {
        this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        this.importantWords = new Set(['ai', 'machine', 'learning', 'data', 'algorithm', 'model', 'neural', 'network', 'deep', 'training']);
    }

    async analyzeRelevance(input, output) {
        const inputKeywords = this.extractKeywords(input);
        const outputKeywords = this.extractKeywords(output);
        
        const commonKeywords = inputKeywords.filter(keyword => outputKeywords.includes(keyword));
        const relevanceScore = commonKeywords.length / Math.max(inputKeywords.length, outputKeywords.length);

        if (relevanceScore > 0.7) {
            return 'high';
        } else if (relevanceScore > 0.4) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    extractKeywords(text) {
        const words = text.toLowerCase().split(/\W+/);
        return words.filter(word => 
            word.length > 2 && 
            !this.stopWords.has(word) &&
            (this.importantWords.has(word) || !/^\d+$/.test(word))
        );
    }

    async extractTopKeywords(text, topN = 5) {
        const words = this.extractKeywords(text);
        const wordFrequency = {};

        words.forEach(word => {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });

        return Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(entry => entry[0]);
    }

    async calculateKeywordDensity(text) {
        const words = text.toLowerCase().split(/\W+/);
        const keywords = this.extractKeywords(text);
        
        const density = keywords.length / words.length;
        return {
            density: density,
            interpretation: this.interpretKeywordDensity(density)
        };
    }

    interpretKeywordDensity(density) {
        if (density > 0.1) {
            return 'high';
        } else if (density > 0.05) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    async suggestKeywordImprovements(input, desiredDensity = 'medium') {
        const { density, interpretation } = await this.calculateKeywordDensity(input);
        const suggestions = [];

        if (interpretation !== desiredDensity) {
            if (interpretation === 'low' && (desiredDensity === 'medium' || desiredDensity === 'high')) {
                suggestions.push('Consider incorporating more relevant keywords into your text.');
                suggestions.push('Try to use synonyms or related terms to increase keyword variety.');
            } else if (interpretation === 'high' && (desiredDensity === 'medium' || desiredDensity === 'low')) {
                suggestions.push('The keyword density might be too high. Consider reducing repetition.');
                suggestions.push('Try to rephrase some sentences to use fewer keywords while maintaining meaning.');
            }
        }

        const topKeywords = await this.extractTopKeywords(input);
        suggestions.push(`Top keywords found: ${topKeywords.join(', ')}. Ensure these are relevant to your topic.`);

        return suggestions;
    }
}
