function getTokenCount(text, model) {
    console.log('getTokenCount model:', model); // Added: Log the model parameter
    if (typeof model !== 'string') {
        throw new Error('Invalid model parameter');
    }
    // ... existing code ...
}