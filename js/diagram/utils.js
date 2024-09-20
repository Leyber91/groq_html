/**
 * Debounce function to limit the rate at which a function can fire.
 * 
 * This function:
 * 1. Creates a closure that holds a timeout variable
 * 2. Returns a new function that wraps the original function
 * 3. Clears any existing timeout when called
 * 4. Sets a new timeout to execute the original function after the specified wait time
 * 5. Passes any arguments to the original function when it's finally executed
 * 
 * @param {Function} func - The function to be debounced
 * @param {number} wait - The number of milliseconds to wait before executing the function
 * @returns {Function} A debounced version of the input function
 * 
 * Usage example:
 * const expensiveOperation = () => console.log('Expensive operation');
 * const debouncedOperation = debounce(expensiveOperation, 300);
 * window.addEventListener('resize', debouncedOperation);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * - js/diagram/controlButtons.js
 * 
 * Role in overall program logic:
 * This debounce function is crucial for optimizing performance in event-driven scenarios.
 * It helps prevent excessive function calls, particularly useful for resource-intensive
 * operations triggered by frequent events like window resizing or user input.
 * By limiting the rate of function execution, it improves the application's responsiveness
 * and efficiency, especially in the context of updating and rendering the MOA diagram.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout); // Clear the timeout every time the function is called
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }