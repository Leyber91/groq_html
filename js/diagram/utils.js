// Debounce function to limit the rate at which a function can fire.
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout); // Clear the timeout every time the function is called
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }
  