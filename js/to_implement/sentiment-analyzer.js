export class SentimentAnalyzer {
    constructor() {
        this.sentimentLexicon = {
            positive: ['good', 'great', 'excellent', 'happy', 'positive', 'wonderful', 'fantastic', 'amazing'],
            negative: ['bad', 'terrible', 'awful', 'sad', 'negative', 'horrible', 'disappointing', 'frustrating']
        };
    }

    async compareSentiment(input, output) {
        const inputSentiment = this.analyzeSentiment(input);
        const outputSentiment = this.analyzeSentiment(output);

        if (inputSentiment === outputSentiment) {
            return 'high';
        } else if (inputSentiment === 'neutral' || outputSentiment === 'neutral') {
            return 'medium';
        } else {
            return 'low';
        }
    }

    analyzeSentiment(text) {
        const words = text.toLowerCase().split(/\W+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (this.sentimentLexicon.positive.includes(word)) {
                positiveCount++;
            } else if (this.sentimentLexicon.negative.includes(word)) {
                negativeCount++;
            }
        });

        if (positiveCount > negativeCount) {
            return 'positive';
        } else if (negativeCount > positiveCount) {
            return 'negative';
        } else {
            return 'neutral';
        }
    }

    async analyzeSentimentIntensity(text) {
        const words = text.toLowerCase().split(/\W+/);
        let sentimentScore = 0;

        words.forEach(word => {
            if (this.sentimentLexicon.positive.includes(word)) {
                sentimentScore++;
            } else if (this.sentimentLexicon.negative.includes(word)) {
                sentimentScore--;
            }
        });

        const intensity = Math.abs(sentimentScore) / words.length;
        return {
            sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral',
            intensity: intensity
        };
    }

    async detectEmotionalShifts(text) {
        const sentences = text.split(/[.!?]+/);
        const sentimentShifts = [];

        for (let i = 1; i < sentences.length; i++) {
            const prevSentiment = await this.analyzeSentimentIntensity(sentences[i - 1]);
            const currentSentiment = await this.analyzeSentimentIntensity(sentences[i]);

            if (prevSentiment.sentiment !== currentSentiment.sentiment) {
                sentimentShifts.push({
                    from: prevSentiment.sentiment,
                    to: currentSentiment.sentiment,
                    intensity: Math.abs(currentSentiment.intensity - prevSentiment.intensity)
                });
            }
        }

        return sentimentShifts;
    }

    async suggestSentimentAdjustments(input, desiredSentiment) {
        const currentSentiment = await this.analyzeSentimentIntensity(input);
        const suggestions = [];

        if (currentSentiment.sentiment !== desiredSentiment) {
            suggestions.push(`Consider adjusting the overall tone to be more ${desiredSentiment}.`);
            
            if (desiredSentiment === 'positive') {
                suggestions.push('Try incorporating more positive words or phrases.');
                suggestions.push('Consider rephrasing negative statements in a more optimistic way.');
            } else if (desiredSentiment === 'negative') {
                suggestions.push('Consider using more critical or cautionary language.');
                suggestions.push('Try to highlight potential challenges or drawbacks.');
            } else {
                suggestions.push('Aim for a more balanced perspective by presenting both positive and negative aspects.');
                suggestions.push('Try to use more neutral language and avoid extreme expressions.');
            }
        } else if (Math.abs(currentSentiment.intensity - 0.5) > 0.3) {
            suggestions.push(`The current ${desiredSentiment} sentiment might be too strong. Consider moderating the tone.`);
        }

        return suggestions;
    }
}
