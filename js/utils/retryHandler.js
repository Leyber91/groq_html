// js/utils/retryHandler.js

export async function retryOperation(operation, delay, retries) {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return retryOperation(operation, delay, retries - 1);
        } else {
            throw error;
        }
    }
}