import { PromptCell } from './prompt-cell.js';
import { handleGracefulDegradation } from './error-handling.js';
import { queueApiRequest } from './api-core.js';
import { AVAILABLE_MODELS, getModelInfo, selectAlternativeModel } from '../config/model-config.js';

/**
 * Class representing the Modular Prompts Puzzle system.
 */
export class ModularPromptsPuzzle {
    constructor() {
        this.cells = new Map(); // Using Map for better access and iteration.
        this.connections = new Map();
        this.history = []; // Maintain a history of actions for logging and debugging.
    }

    /**
     * Adds a new prompt cell to the puzzle.
     * 
     * How it works:
     * 1. Checks if a cell with the given ID already exists
     * 2. If not, creates a new PromptCell instance
     * 3. Adds the new cell to the cells Map
     * 4. Records the action in the history
     * 
     * Usage example:
     * const puzzle = new ModularPromptsPuzzle();
     * puzzle.addCell('cell1', 'What is the capital of France?', { execute: () => {} }, { model: 'gpt-3.5-turbo' });
     * 
     * Used in:
     * - puzzle-initialization.js
     * - user-interface.js
     * 
     * Role in program logic:
     * This function is crucial for building the puzzle structure, allowing new cells to be added dynamically.
     * It's typically called during initial setup or when users create new prompts in the interface.
     * 
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
     * 
     * How it works:
     * 1. Checks if both cells exist
     * 2. If they do, creates bidirectional connections in the connections Map
     * 3. Records the action in the history
     * 
     * Usage example:
     * puzzle.connectCells('cell1', 'cell2');
     * 
     * Used in:
     * - puzzle-initialization.js
     * - user-interface.js
     * - network-builder.js
     * 
     * Role in program logic:
     * This function establishes relationships between cells, which is essential for the network structure of the puzzle.
     * It enables information flow and interactions between different prompts in the system.
     * 
     * @param {string} fromId - ID of the source cell.
     * @param {string} toId - ID of the target cell.
     */
    connectCells(fromId, toId) {
        if (!this.cells.has(fromId) || !this.cells.has(toId)) {
            console.warn(`One or both cells (${fromId}, ${toId}) do not exist. Cannot create connection.`);
            return;
        }

        // Storing bidirectional connection as unique key-value pairs in Map.
        this.connections.set(`${fromId}-${toId}`, { from: fromId, to: toId });
        this.connections.set(`${toId}-${fromId}`, { from: toId, to: fromId });
        this.history.push({ action: 'connectCells', fromId, toId, timestamp: Date.now() });
    }

    /**
     * Executes a specific cell by ID.
     * 
     * How it works:
     * 1. Retrieves the cell from the cells Map
     * 2. Sets the cell state to 'executing'
     * 3. Queues an API request with the cell's prompt and metadata
     * 4. Handles the result or any errors
     * 5. Updates the cell state and records the action in history
     * 
     * Usage example:
     * const result = await puzzle.executeCell('cell1');
     * console.log(result);
     * 
     * Used in:
     * - execution-manager.js
     * - user-interface.js
     * 
     * Role in program logic:
     * This function is central to the puzzle's functionality, allowing individual prompts to be processed.
     * It interacts with the API, handles errors, and manages cell states, making it a key part of the execution flow.
     * 
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
                cell.setError(gracefulResult.message || 'Execution failed');
                return gracefulResult;
            }
            cell.setError(error.message);
            throw error;
        }
    }

    /**
     * Resonates the entire network of connected cells.
     * 
     * How it works:
     * 1. Iterates through all cells in the puzzle
     * 2. For each cell, finds its connected cells
     * 3. Calls the resonate method on each cell with its connected cells
     * 4. Handles any errors and applies graceful degradation
     * 5. Records the results in the history
     * 
     * Usage example:
     * const networkResults = await puzzle.resonateNetwork();
     * console.log(networkResults);
     * 
     * Used in:
     * - network-manager.js
     * - advanced-features.js
     * 
     * Role in program logic:
     * This function orchestrates the complex interactions between all cells in the puzzle.
     * It's crucial for creating emergent behaviors and allowing information to flow through the entire network.
     * 
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
                return gracefulResult;
            }
            throw error;
        }
    }

    /**
     * Expands the puzzle fractally by creating sub-cells.
     * 
     * How it works:
     * 1. Recursively creates sub-cells for each existing cell up to the specified depth
     * 2. Assigns alternative models to sub-cells when possible
     * 3. Connects new sub-cells to their parent cells
     * 4. Updates the puzzle structure with new cells and connections
     * 5. Records the expansion in the history
     * 
     * Usage example:
     * await puzzle.fractalExpansion(2);
     * 
     * Used in:
     * - advanced-features.js
     * - puzzle-evolution.js
     * 
     * Role in program logic:
     * This function enables the puzzle to grow in complexity and scale dynamically.
     * It's key to creating more sophisticated and nuanced prompt networks, allowing for deeper exploration of topics.
     * 
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

            await this.fractalExpansion(depth - 1); // Recursion for deeper levels.
        } catch (error) {
            console.error('Error in fractal expansion:', error);
            await handleGracefulDegradation(error, 'fractalExpansion');
        }
    }

    /**
     * Returns a string representation of the puzzle.
     * 
     * How it works:
     * Simply returns a string with the count of cells and connections in the puzzle.
     * 
     * Usage example:
     * console.log(puzzle.toString());
     * 
     * Used in:
     * - logging.js
     * - debug-tools.js
     * 
     * Role in program logic:
     * This function provides a quick overview of the puzzle's size and complexity.
     * It's useful for logging, debugging, and giving users a high-level understanding of the puzzle structure.
     * 
     * @returns {string}
     */
    toString() {
        return `ModularPromptsPuzzle with ${this.cells.size} cells and ${this.connections.size / 2} connections`;
    }

    /**
     * Visualizes the structure of the puzzle.
     * 
     * How it works:
     * 1. Creates a string representation of the puzzle structure
     * 2. Iterates through all cells, adding their details to the visualization
     * 3. For each cell, lists its connections to other cells
     * 4. Includes model information for each cell
     * 
     * Usage example:
     * const visualization = puzzle.visualize();
     * console.log(visualization);
     * 
     * Used in:
     * - user-interface.js
     * - debug-tools.js
     * - reporting.js
     * 
     * Role in program logic:
     * This function is crucial for understanding and debugging the puzzle structure.
     * It provides a detailed view of how cells are connected and what models they use, which is valuable for both developers and advanced users.
     * 
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
