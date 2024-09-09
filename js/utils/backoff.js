export async function exponentialBackoff(fn, options) {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 30000 } = options;
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('Rate limit exceeded')) {
                retries++;
                if (retries >= maxRetries) {
                    throw error;
                }
                console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * 2, maxDelay);
            } else {
                throw error;
            }
        }
    }
}