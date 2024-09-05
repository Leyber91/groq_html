import { queueApiRequest } from './old/api.js';

const ORCHESTRATOR_MODEL = 'llama3-70b-8192';
const ORCHESTRATOR_TEMPERATURE = 0.7;

export async function orchestrateResponse(response) {
    const prompt = `
You are an AI assistant orchestrator. Your task is to improve and refine the following AI-generated response:

${response}

Please enhance this response by:
1. Correcting any grammatical or spelling errors
2. Improving the clarity and coherence of the text
3. Adding relevant details or examples if necessary
4. Ensuring the tone is professional and helpful
5. Formatting the response with appropriate markdown for better readability

Provide the improved response:
`;

    const orchestratedResponse = await queueApiRequest(
        ORCHESTRATOR_MODEL,
        [{ role: 'user', content: prompt }],
        ORCHESTRATOR_TEMPERATURE
    );

    return orchestratedResponse;
}
