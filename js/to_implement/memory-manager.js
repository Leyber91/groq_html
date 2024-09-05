export class MemoryManager {
    constructor() {
        this.shortTermMemory = [];
        this.longTermMemory = new Map();
    }

    updateMemory(input, output) {
        this.shortTermMemory.push({ input, output, timestamp: Date.now() });
        if (this.shortTermMemory.length > 10) {
            this.shortTermMemory.shift();
        }

        // Update long-term memory (simple implementation)
        const keywords = this.extractKeywords(input + ' ' + output);
        keywords.forEach(keyword => {
            if (!this.longTermMemory.has(keyword)) {
                this.longTermMemory.set(keyword, []);
            }
            this.longTermMemory.get(keyword).push({ input, output, timestamp: Date.now() });
        });
    }

    extractKeywords(text) {
        // Simple keyword extraction (improve this for better results)
        return text.toLowerCase().split(/\W+/).filter(word => word.length > 4);
    }

    getRelevantMemories(input) {
        const keywords = this.extractKeywords(input);
        const relevantMemories = new Set();

        keywords.forEach(keyword => {
            const memories = this.longTermMemory.get(keyword) || [];
            memories.forEach(memory => relevantMemories.add(memory));
        });

        return [...relevantMemories, ...this.shortTermMemory].sort((a, b) => b.timestamp - a.timestamp);
    }
}
