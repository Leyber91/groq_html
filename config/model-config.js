export const RATE_LIMITS = {
    'llama3-70b-8192': { rpm: 30, tpm: 6000 },
    // ... other models
};

export function getRateLimitStatus(model) {
    // Implement logic to track and return usage status
    // This could be in-memory, a database, or another storage mechanism
    return {
        usedTokens: 0, // Replace with actual used tokens
    };
}