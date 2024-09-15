class QuantumCircuit {
    constructor(nQubits) {
      this.nQubits = nQubits;
      this.gates = [];
    }
  
    addGate(gate, qubitIndex) {
      if (qubitIndex >= this.nQubits) throw new Error('Qubit index out of range');
      this.gates.push({ gate, qubitIndex });
    }
  
    run() {
      const results = [];
      for (let i = 0; i < this.nQubits; i++) {
        const active = this.gates.some(g => g.qubitIndex === i && g.gate === 'H'); // Assume 'H' is a Hadamard gate
        results.push(active ? 1 : 0);
      }
      return results;
    }
  
    reset() {
      this.gates = [];
    }
  }
  
  export default QuantumCircuit;
  