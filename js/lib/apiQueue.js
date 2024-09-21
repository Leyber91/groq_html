// js/lib/apiQueue.js
const apiQueue = [];
let isProcessingQueue = false;
export function insertRequestIntoQueue(request) {
    if (request.priority === 'high') {
        apiQueue.unshift(request);
    } else if (request.priority === 'low') {
        apiQueue.push(request);
    } else {
        // Default to normal priority
        const normalIndex = apiQueue.findIndex(item => item.priority === 'low');
        if (normalIndex === -1) {
            apiQueue.push(request);
        } else {
            apiQueue.splice(normalIndex, 0, request);
        }
    }
}
export function getNextBatch(batchSize) {
    return apiQueue.splice(0, batchSize);
}
export function isQueueEmpty() {
    return apiQueue.length === 0;
}
export function setProcessingState(state) {
    isProcessingQueue = state;
}
export function getProcessingState() {
    return isProcessingQueue;
}