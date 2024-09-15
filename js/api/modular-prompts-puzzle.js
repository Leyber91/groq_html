import { PromptCell } from './prompt-cell.js';
import { handleGracefulDegradation } from './error-handling.js';
import { queueApiRequest } from './api-core.js';
import { AVAILABLE_MODELS, getModelInfo, selectAlternativeModel } from '../config/model-config.js';

/**
 * Class representing the Modular Prompts Puzzle system.
 */
export class ModularPromptsPuzzle {
    constructor() {
        /** @type {Map<string, PromptCell>} */
        this.cells = new Map();

        /** @type {Map<string, { from: string, to: string }>} */
        this.connections = new Map();

        /** @type {Array<Object>} */
        this.history = [];
    }

    /**
     * Adds a new prompt cell to the puzzle.
     * @param {string} id - Unique identifier for the cell.
     * @param {string} prompt - The prompt text.
     * @param {object} methods - Methods for cell operations.
     * @param {object} metadata - Additional metadata for the cell.
     */
    addCell(id, prompt, methods, metadata) {
        if (this.cells.has(id)) {
            console.warn(`Cell with id ${id} already exists. Skipping addition.`);
            return;
        }
        const cell = new PromptCell(prompt, methods, metadata);
        this.cells.set(id, cell);
        this.history.push({ action: 'addCell', id, timestamp: Date.now() });
    }

    /**
     * Connects two cells bidirectionally.
     * @param {string} fromId - ID of the source cell.
     * @param {string} toId - ID of the target cell.
     */
    connectCells(fromId, toId) {
        if (!this.cells.has(fromId) || !this.cells.has(toId)) {
            console.warn(`One or both cells (${fromId}, ${toId}) do not exist. Cannot create connection.`);
            return;
        }
        this.connections.set(`${fromId}-${toId}`, { from: fromId, to: toId });
        this.connections.set(`${toId}-${fromId}`, { from: toId, to: fromId });
        this.history.push({ action: 'connectCells', fromId, toId, timestamp: Date.now() });
    }

    /**
     * Executes a specific cell by ID.
     * @param {string} id - ID of the cell to execute.
     * @returns {Promise<string|Object>} Result of the execution.
     */
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

    /**
     * Resonates the entire network of connected cells.
     * @returns {Promise<Array<Object>>} Results of the resonation.
     */
    async resonateNetwork() {
        try {
            const results = [];
            for (const [id, cell] of this.cells.entries()) {
                const connectedCells = Array.from(this.connections.values())
                    .filter(conn => conn.from === id)
                    .map(conn => this.cells.get(conn.to))
                    .filter(Boolean);
                const result = await cell.resonate(connectedCells);
                const gracefulResult = await handleGracefulDegradation(result, `resonate:${id}`);
                results.push({ id, result: gracefulResult || result });
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

    /**
     * Expands the puzzle fractally by creating sub-cells.
     * @param {number} depth - Depth of fractal expansion.
     * @returns {Promise<void>}
     */
    async fractalExpansion(depth = 1) {
        if (depth <= 0) return;
        try {
            const newCells = new Map();
            for (const [id, cell] of this.cells.entries()) {
                const subCells = cell.fractalExpand();
                subCells.forEach((subCell, index) => {
                    const subId = `${id}_sub${index}`;
                    const alternativeModel = selectAlternativeModel(cell.metadata.model);
                    subCell.metadata.model = alternativeModel || cell.metadata.model;
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

    /**
     * Returns a string representation of the puzzle.
     * @returns {string}
     */
    toString() {
        return `ModularPromptsPuzzle with ${this.cells.size} cells and ${this.connections.size / 2} connections`;
    }

    /**
     * Visualizes the structure of the puzzle.
     * @returns {string} Visualization string.
     */
    visualize() {
        let visualization = 'Modular Prompts Puzzle Structure:\n';
        this.cells.forEach((cell, id) => {
            const modelInfo = getModelInfo(cell.metadata.model);
            visualization += `Cell ${id}: ${cell.toString()} (Model: ${cell.metadata.model}, Context Window: ${modelInfo.contextWindow})\n`;
            const connections = Array.from(this.connections.values())
                .filter(conn => conn.from === id)
                .map(conn => conn.to);
            if (connections.length > 0) {
                visualization += `  Connected to: ${connections.join(', ')}\n`;
            }
        });
        return visualization;
    }
}