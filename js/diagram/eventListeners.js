import { debounce } from './utils.js';
import { updateMOAConfig } from './diagramActions.js';

export function addEventListeners(svg, simulation) {
  svg.selectAll('.agent-model, .agent-temperature').on(
    'change',
    debounce(() => {
      updateMOAConfig();
    }, 250)
  );
}
