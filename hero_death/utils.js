/**
 * Utilities Module
 * 
 * Pure utility functions with no side effects.
 * These don't depend on game state.
 */

const Utils = {
    /**
     * Parse a CSS value to a number
     * @param {string} input - CSS value like "100px"
     * @returns {number}
     */
    number(input) {
        if (typeof input !== 'string') {
            return 0;
        }
        return Math.round(parseFloat(input));
    },
    
    /**
     * Get a numeric CSS property from a jQuery element
     * @param {jQuery|string} element - Element or selector
     * @param {string} property - CSS property name
     * @returns {number}
     */
    i(element, property) {
        const el = $(element);
        if (el.length === 0) return 0;
        const value = el.css(property);
        return value ? this.number(value) : 0;
    },
    
    /**
     * Generate HTML for damage number display
     * @param {number} num - The number to display
     * @param {string} color - Color name (yellow, orange, red)
     * @returns {string} HTML string
     */
    prettyNumber(num, color) {
        const digits = num.toString().split('');
        return digits.map(digit => 
            `<img number="${digit}" src="assets/number-${digit}-${color}.webp" />`
        ).join('');
    },
    
    /**
     * Replace dashes with spaces
     * @param {string} str 
     * @returns {string}
     */
    spaceDash(str) {
        return str.replace(/-/g, ' ');
    },
    
    /**
     * Calculate average of array
     * @param {number[]} arr 
     * @returns {number}
     */
    average(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    },
    
    /**
     * Get sign of number (-1, 0, or 1)
     * @param {number} num 
     * @returns {number}
     */
    sign(num) {
        return Math.sign(num);
    },
    
    /**
     * Absolute value
     * @param {number} num 
     * @returns {number}
     */
    abs(num) {
        return Math.abs(num);
    },
    
    /**
     * Round to nearest integer
     * @param {number} num 
     * @returns {number}
     */
    round(num) {
        return Math.round(num);
    },
    
    /**
     * Random integer between min and max (inclusive)
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    random(min, max) {
        return Math.floor(Math.random() * (max + 1 - min) + min);
    },
    
    /**
     * Apply random spread to a number
     * @param {number} num - Base number
     * @param {number} spreadPercent - Spread percentage (e.g., 20 for ±20%)
     * @returns {number}
     */
    spread(num, spreadPercent) {
        const multiplier = this.random(100 - spreadPercent, 100 + spreadPercent);
        return Math.round(num * (multiplier / 100));
    }
};

// ========== SHORTHAND ALIASES ==========
// For convenience, expose commonly used functions globally
// This eases migration from old code

const number = (input) => Utils.number(input);
const i = (element, property) => Utils.i(element, property);
const prettyNumber = (num, color) => Utils.prettyNumber(num, color);
const spcDash = (str) => Utils.spaceDash(str);
const average = (arr) => Utils.average(arr);
const sign = (num) => Utils.sign(num);
const abs = (num) => Utils.abs(num);
const round = (num) => Utils.round(num);
const random = (min, max) => Utils.random(min, max);
const spread = (num, spreadPercent) => Utils.spread(num, spreadPercent);
