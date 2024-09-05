export class LLMChain {
    constructor(model, systemPrompt) {
        this.model = model;
        this.systemPrompt = systemPrompt;
    }

    async call(userPrompt) {
        const response = await this.model.generate(userPrompt, this.systemPrompt);
        return response.text;
    }
}

