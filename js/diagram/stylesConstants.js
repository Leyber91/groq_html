// Styles Constants

/**
 * This file contains constant values for styling various elements in the diagram.
 * These constants are used throughout the project to maintain consistent styling and simplify updates.
 * 
 * Usage example:
 * import { NODE_RADIUS, AGENT_FILL_COLOR } from './stylesConstants.js';
 * 
 * const node = svg.append('circle')
 *   .attr('r', NODE_RADIUS)
 *   .attr('fill', AGENT_FILL_COLOR);
 * 
 * Files that use these constants:
 * - js/diagram/nodeElements.js
 * - js/diagram/linkElements.js
 * - js/diagram/controlButtons.js
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * These constants centralize styling information, making it easier to maintain a consistent look and feel
 * across the entire diagram. By using these constants, we can easily update styles in one place and have
 * the changes reflected throughout the application.
 */

// Node Styles
export const NODE_RADIUS = 30;
export const MAIN_MODEL_FILL_COLOR = '#ff4136';
export const AGENT_FILL_COLOR = '#3498db';
export const AGENT_HIGHLIGHT_FILL_COLOR = '#ff7b72';
export const MAIN_MODEL_HIGHLIGHT_FILL_COLOR = '#ff7b72';
export const NODE_GLOW_FILTER = 'url(#node-glow)';
export const NODE_STROKE_COLOR = '#2c3e50';
export const NODE_STROKE_WIDTH = 2;

// Link Styles
export const LINK_STROKE_COLOR = '#999';
export const LINK_STROKE_OPACITY = 0.6;
export const LINK_GLOW_FILTER = 'url(#link-glow)';
export const LINK_HIGHLIGHT_STROKE_COLOR = '#ff4136';
export const LINK_STROKE_WIDTH = 2;
export const LINK_HIGHLIGHT_STROKE_WIDTH = 3;

// Button Styles
export const ADD_LAYER_BUTTON_FILL = '#ff6b6b';
export const ADD_AGENT_BUTTON_FILL = '#4ecdc4';
export const REMOVE_LAYER_BUTTON_FILL = '#fc5c65';
export const REMOVE_AGENT_BUTTON_FILL = '#fc5c65';
export const REMOVE_AGENT_BUTTON_HOVER_FILL = '#ff7675';
export const BUTTON_TEXT_FILL = 'white';
export const BUTTON_TEXT_FONT_WEIGHT = 'bold';
export const BUTTON_TEXT_FONT_SIZE = '18px';
export const BUTTON_GLOW_FILTER = 'url(#button-glow)';
export const BUTTON_STROKE_COLOR = '#2c3e50';
export const BUTTON_STROKE_WIDTH = 1;

// Form Styles
export const FORM_BACKGROUND_COLOR = 'rgba(255, 255, 255, 0.1)';
export const FORM_BORDER_COLOR = '1px solid rgba(255, 107, 107, 0.3)';
export const FORM_BORDER_RADIUS = '5px';
export const FORM_TEXT_COLOR = '#f0f0f0';
export const FORM_PADDING = '5px';
export const FORM_FONT_SIZE = '14px';
export const FORM_FONT_FAMILY = 'Arial, sans-serif';

// Sizes
export const FORM_WIDTH = 150;
export const FORM_HEIGHT = 30;
export const ADD_LAYER_BUTTON_WIDTH = 100;
export const ADD_LAYER_BUTTON_HEIGHT = 30;
export const ADD_LAYER_BUTTON_RADIUS = 15;
export const ADD_AGENT_BUTTON_WIDTH = 100;
export const ADD_AGENT_BUTTON_HEIGHT = 30;
export const ADD_AGENT_BUTTON_RADIUS = 15;
export const REMOVE_LAYER_BUTTON_WIDTH = 100;
export const REMOVE_LAYER_BUTTON_HEIGHT = 30;
export const REMOVE_LAYER_BUTTON_RADIUS = 15;
export const REMOVE_AGENT_BUTTON_RADIUS = 12;

// Animation Durations
export const BUTTON_HOVER_DURATION = 200;
export const NODE_ANIMATION_DURATION = 500;
export const LINK_ANIMATION_DURATION = 500;
export const FORM_TRANSITION_DURATION = 300;

// Z-Index
export const NODE_Z_INDEX = 10;
export const LINK_Z_INDEX = 5;
export const BUTTON_Z_INDEX = 20;
export const FORM_Z_INDEX = 30;
