import { PromptCell } from './prompt-cell.js';
import { handleGracefulDegradation } from './error-handling.js';
import { queueApiRequest } from './api-core.js';
import { AVAILABLE_MODELS, MODEL_INFO, getModelInfo, selectAlternativeModel } from '../config/model-config.js';

export class ModularPromptsPuzzle {
  constructor() {
    this.cells = new Map();
    this.connections = new Map();
    this.history = [];
  }

  addCell(id, prompt, methods, metadata) {
    const cell = new PromptCell(prompt, methods, metadata);
    this.cells.set(id, cell);
  }

  connectCells(fromId, toId) {
    this.connections.set(`${fromId}-${toId}`, { from: fromId, to: toId });
    this.connections.set(`${toId}-${fromId}`, { from: toId, to: fromId });
  }

  async executeCell(id) {
    const cell = this.cells.get(id);
    if (!cell) {
      throw new Error(`Cell with id ${id} not found`);
    }
    cell.setState('executing');
    try {
      const result = await queueApiRequest(
        cell.metadata.model,
        [{ role: 'user', content: cell.getPrompt() }],
        cell.metadata.temperature || 0.7,
        cell.updateCallback.bind(cell)
      );
      cell.setState('idle');
      this.history.push({ action: 'executeCell', id, result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error(`Error executing cell ${id}:`, error);
      const gracefulResult = await handleGracefulDegradation(error, `executeCell:${id}`);
      if (gracefulResult) {
        console.warn(`Cell ${id} degraded execution:`, gracefulResult);
        cell.setError(gracefulResult.message || 'Execution failed');
        return gracefulResult;
      }
      cell.setError(error.message);
      throw error;
    }
  }

  async resonateNetwork() {
    try {
      const results = [];
      for (let [id, cell] of this.cells.entries()) {
        const connectedCells = Array.from(this.connections.entries())
          .filter(([key, value]) => key.startsWith(id))
          .map(([key, value]) => this.cells.get(value.to));
        const result = await cell.resonate(connectedCells);
        results.push({ id, result: await handleGracefulDegradation(result, `resonate:${id}`) });
      }
      this.history.push({ action: 'resonateNetwork', results, timestamp: Date.now() });
      return results;
    } catch (error) {
      console.error('Error in network resonation:', error);
      const gracefulResult = await handleGracefulDegradation(error, 'resonateNetwork');
      if (gracefulResult) {
        console.warn('Network resonation degraded:', gracefulResult);
        return gracefulResult;
      }
      throw error;
    }
  }

  async fractalExpansion(depth = 1) {
    if (depth <= 0) return;
    try {
      const newCells = new Map();
      for (const [id, cell] of this.cells.entries()) {
        const subCells = cell.fractalExpand();
        subCells.forEach((subCell, index) => {
          const subId = `${id}_sub${index}`;
          const model = selectAlternativeModel(cell.metadata.model);
          subCell.metadata.model = model;
          newCells.set(subId, subCell);
          this.connectCells(id, subId);
        });
      }
      this.cells = new Map([...this.cells, ...newCells]);
      this.history.push({ action: 'fractalExpansion', depth, newCellCount: newCells.size, timestamp: Date.now() });
      await this.fractalExpansion(depth - 1);
    } catch (error) {
      console.error('Error in fractal expansion:', error);
      await handleGracefulDegradation(error, 'fractalExpansion');
    }
  }

  toString() {
    return `ModularPromptsPuzzle with ${this.cells.size} cells and ${this.connections.size / 2} connections`;
  }

  visualize() {
    let visualization = 'Modular Prompts Puzzle Structure:\n';
    for (const [id, cell] of this.cells.entries()) {
      const modelInfo = getModelInfo(cell.metadata.model);
      visualization += `Cell ${id}: ${cell.toString()} (Model: ${cell.metadata.model}, Context Window: ${modelInfo.contextWindow})\n`;
      const connections = Array.from(this.connections.entries())
        .filter(([key, value]) => key.startsWith(id))
        .map(([key, value]) => value.to);
      if (connections.length > 0) {
        visualization += `  Connected to: ${connections.join(', ')}\n`;
      }
    }
    return visualization;
  }
}