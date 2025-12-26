/**
 * Input Module
 * 
 * Handles keyboard input and cursor visibility.
 */

const Input = {
    /**
     * Initialize input handlers
     */
    init() {
        this._setupKeyboardHandlers();
        this._setupCursorHandlers();
    },
    
    /**
     * Hide the cursor
     */
    hideCursor() {
        $('*').css('cursor', 'none');
    },
    
    /**
     * Show the custom cursor
     */
    showCursor() {
        $('*').css('cursor', 'url(assets/cursor.svg), auto');
    },
    
    // ========== PRIVATE ==========
    
    _setupKeyboardHandlers() {
        document.onkeydown = (e) => {
            const K = Constants.KEYS;
            
            switch (e.keyCode) {
                case K.RIGHT:
                    GameState.keyState.right = true;
                    break;
                case K.LEFT:
                    GameState.keyState.left = true;
                    break;
                case K.UP:
                    Player.jump();
                    break;
                case K.ATTACK:
                    if (!Combat.attackCooldown) Combat.fight();
                    break;
                // Uncomment to enable skills:
                // case K.SKILL_S:
                //     if (!Combat.skillCooldown) Combat.useSkill('s');
                //     break;
                // case K.SKILL_D:
                //     if (!Combat.skillCooldown) Combat.useSkill('d');
                //     break;
                case K.PICKUP:
                    Player.pickUp();
                    break;
                case K.INTERACT:
                    MapManager.interact();
                    break;
                case K.BACKPACK:
                    $('.card.backpack').toggle();
                    break;
                case K.ESCAPE:
                    UI.closeCard();
                    break;
                case K.NUM_1:
                case K.NUM_2:
                case K.NUM_3:
                case K.NUM_4:
                case K.NUM_5:
                case K.NUM_6:
                case K.NUM_7:
                case K.NUM_8:
                case K.NUM_9:
                    // Convert key code to slot number (1-9)
                    const slot = e.keyCode - K.NUM_1 + 1;
                    Player.consume(slot);
                    break;
            }
        };
        
        document.onkeyup = (e) => {
            const K = Constants.KEYS;
            
            switch (e.keyCode) {
                case K.RIGHT:
                    GameState.keyState.right = false;
                    break;
                case K.LEFT:
                    GameState.keyState.left = false;
                    break;
            }
        };
    },
    
    _setupCursorHandlers() {
        $(document).on('mousemove', () => this.showCursor());
    }
};
