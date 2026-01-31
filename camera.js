/**
 * Camera Module
 * 
 * Handles camera positioning and smooth scrolling with edge-aware behavior.
 * The camera follows the player and stops at map edges.
 */

const Camera = {
    // Camera state
    position: 0,        // Current camera X position (left edge of viewport in world coords)
    
    /**
     * Update camera position based on player position
     * Called every game tick
     */
    update() {
        const state = GameState;
        const windowWidth = this.getWindowWidth();
        const halfWindow = windowWidth / 2;
        
        const desiredCameraCenter = state.player.position; //centered on player
        
        // Convert to camera left edge position
        let desiredPosition = desiredCameraCenter - halfWindow;
        
        // Clamp camera so we never show beyond map edges
        const minPosition = 0;  // Left edge of map
        const maxPosition = Math.max(0, state.mapWidth - windowWidth);  // Right edge
        
        this.position = Math.max(minPosition, Math.min(maxPosition, desiredPosition));
    },
    
    /**
     * Apply camera position to DOM elements
     * Moves the field and parallax layers, and adjusts hero screen position
     */
    apply() {
        const state = GameState;
        const windowWidth = this.getWindowWidth();
        const fieldOffset = -this.position;
        $('.field').css('left', fieldOffset + 'px');
        
        // Calculate hero's screen position
        // Hero position in world - camera position = screen position
        const heroScreenX = state.player.position - this.position;
        
        $('.hero').css('left', (heroScreenX - Constants.HERO_WIDTH / 2) + 'px');
        $('.hero-shadow').css('left', (heroScreenX - Constants.HERO_SHADOW_WIDTH / 2) + 'px');
        
        // Parallax layers
        this._applyParallax(state, windowWidth);
    },
    
    /**
     * Apply parallax effect to background/foreground layers
     * @private
     */
    _applyParallax(state, windowWidth) {
        // Calculate how far through the map we've scrolled (0 to 1)
        const scrollableDistance = Math.max(1, state.mapWidth - windowWidth);
        const scrollProgress = this.position / scrollableDistance;
        
        // Back layer parallax (moves slower than camera)
        if (state.backWidth > 0) {
            const backScrollable = Math.max(0, state.backWidth - windowWidth);
            const backOffset = -scrollProgress * backScrollable;
            $('.back').css('left', backOffset + 'px');
        }
        
        // Front layer parallax (can move faster or same as camera)
        if (state.frontWidth > 0) {
            const frontScrollable = Math.max(0, state.frontWidth - windowWidth);
            const frontOffset = -scrollProgress * frontScrollable;
            $('.front').css('left', frontOffset + 'px');
        }
    },
    
    /**
     * Combined update and apply (convenience method for game loop)
     */
    follow() {
        this.update();
        this.apply();
    },
    
    /**
     * Get the viewport/window width
     * @returns {number} Window width in pixels
     */
    getWindowWidth() {
        return i('.window', 'width');
    },
    
    /**
     * Check if camera is at the left edge (can't scroll further left)
     * @returns {boolean}
     */
    isAtLeftEdge() {
        return this.position <= 0;
    },
    
    /**
     * Check if camera is at the right edge (can't scroll further right)
     * @returns {boolean}
     */
    isAtRightEdge() {
        const windowWidth = this.getWindowWidth();
        return this.position >= GameState.mapWidth - windowWidth;
    },
    
    /**
     * Convert world X coordinate to screen X coordinate
     * @param {number} worldX - X position in world/map coordinates
     * @returns {number} X position on screen
     */
    worldToScreen(worldX) {
        return worldX - this.position;
    },
    
    /**
     * Convert screen X coordinate to world X coordinate
     * @param {number} screenX - X position on screen
     * @returns {number} X position in world/map coordinates
     */
    screenToWorld(screenX) {
        return screenX + this.position;
    },
    
    /**
     * Reset camera to initial state (call when entering new map)
     */
    reset() {
        this.position = 0;
    }
};
