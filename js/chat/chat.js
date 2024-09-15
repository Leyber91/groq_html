
import { 
    generateArtifacts, 
    addArtifactsToChat, 
    handleArtifact, 
    updateArtifact 
} from './artifacts.js';
import { processBatchedRequests } from './batchProcessing.js';
import { chatWithMOA as coreChatWithMOA } from './chatInteractions.js';

// Re-export the necessary functions to maintain the same external interface
export {
    coreChatWithMOA as chatWithMOA,
    processBatchedRequests,
    generateArtifacts,
    addArtifactsToChat,
    handleArtifact,
    updateArtifact
};
