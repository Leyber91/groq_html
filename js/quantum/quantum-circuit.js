/**
 * Represents a quantum circuit with a specified number of qubits.
 * This class allows for the creation, manipulation, and execution of quantum circuits.
 */
class QuantumCircuit {
    /**
     * Creates a new QuantumCircuit instance.
     * 
     * @param {number} nQubits - The number of qubits in the circuit.
     * 
     * Usage example:
     * const circuit = new QuantumCircuit(3);
     * 
     * Files that use this constructor:
     * - js/quantum/quantum-simulator.js
     * - js/quantum/quantum-algorithm.js
     * 
     * Role in program logic:
     * This constructor initializes the quantum circuit, which is the foundation
     * for all quantum operations and algorithms in the program.
     */
    constructor(nQubits) {
      this.nQubits = nQubits;
      this.gates = [];
    }
  
    /**
     * Adds a quantum gate to the circuit.
     * 
     * @param {string} gate - The type of gate to add (e.g., 'H' for Hadamard).
     * @param {number} qubitIndex - The index of the qubit to apply the gate to.
     * @throws {Error} If the qubit index is out of range.
     * 
     * Usage example:
     * circuit.addGate('H', 0);
     * 
     * Files that use this function:
     * - js/quantum/quantum-algorithm.js
     * - js/ui/circuit-builder.js
     * 
     * Role in program logic:
     * This function allows for the construction of quantum circuits by adding
     * gates to specific qubits, which is essential for defining quantum algorithms.
     */
    addGate(gate, qubitIndex) {
      if (qubitIndex >= this.nQubits) throw new Error('Qubit index out of range');
      this.gates.push({ gate, qubitIndex });
    }
  
    /**
     * Executes the quantum circuit and returns the measurement results.
     * 
     * @returns {Array<number>} An array representing the state of each qubit (0 or 1).
     * 
     * Usage example:
     * const results = circuit.run();
     * console.log(results); // e.g., [1, 0, 1]
     * 
     * Files that use this function:
     * - js/quantum/quantum-simulator.js
     * - js/ui/results-display.js
     * 
     * Role in program logic:
     * This function simulates the execution of the quantum circuit, which is crucial
     * for obtaining results from quantum algorithms and displaying them to the user.
     * Note: This implementation is simplified and assumes only Hadamard gates.
     */
    run() {
      const results = [];
      for (let i = 0; i < this.nQubits; i++) {
        const active = this.gates.some(g => g.qubitIndex === i && g.gate === 'H'); // Assume 'H' is a Hadamard gate
        results.push(active ? 1 : 0);
      }
      return results;
    }
  
    /**
     * Resets the quantum circuit by clearing all gates.
     * 
     * Usage example:
     * circuit.reset();
     * 
     * Files that use this function:
     * - js/ui/circuit-builder.js
     * - js/quantum/quantum-algorithm.js
     * 
     * Role in program logic:
     * This function allows for the reinitialization of the quantum circuit,
     * which is useful when running multiple experiments or when the user
     * wants to start building a new circuit from scratch.
     */
    reset() {
      this.gates = [];
    }
  }
  
  export default QuantumCircuit;