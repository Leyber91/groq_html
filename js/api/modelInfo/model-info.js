// File: js/api/modelInfo/model-info.js

import { MODEL_INFO } from '../../config/model-config.js';

export const availableModels = Object.keys(MODEL_INFO);

export function getModelInfo(modelName) {
  return MODEL_INFO[modelName] || null;
}

export function isModelAvailable(modelName) {
  return availableModels.includes(modelName);
}
export function getModelContextWindow(modelName) {
  const model = getModelInfo(modelName);
  return model ? model.contextWindow : 0;
}

export function estimateTokens(messages, modelName) {
    const tokenizer = getModelTokenizer(modelName);
    return tokenizer.encode(messages).length;
  }

  export function getModelTokenizer(modelName) {
    return {
      encode: (text) => {
        if (typeof text === 'string') {
          return text.split(' ');
        } else if (Array.isArray(text)) {
          return text.flatMap(item => {
            if (typeof item === 'string') {
              return item.split(' ');
            } else if (item && typeof item === 'object' && typeof item.content === 'string') {
              return item.content.split(' ');
            }
            return [];
          });
        }
        return [];
      },
    };
  }


export function getModelTokenLimit(modelName) {
  const model = getModelInfo(modelName);
  return model ? model.tokenLimit : 0;
}