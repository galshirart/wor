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
            
            // Handle ESC - close cards first, then toggle menu
            if (e.keyCode === K.ESCAPE) {
                const openCards = $('.card:visible').not('.menu');
                if (openCards.length > 0) {
                    UI.closeCard();
                    sound('click');
                } else {
                    MenuUI.toggle();
                }
                return;
            }
            
            // Block all other inputs when game is paused (menu open)
            if (GameState.paused || GameState.heroIsDead) {
                return;
            }
            
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
                case K.BLOCK:
                    Player.startBlock();
                    break;
                // Uncomment to enable skills:
                // case K.SKILL_W:
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
                    UI.toggleBackpackCard();
                    break;
                case K.QUESTS:
                    UI.toggleQuestsCard();
                    break;
                case K.CONTINENT_MAP:
                    UI.toggleMapCard();
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
                case K.BLOCK:
                    Player.stopBlock();
                    break;
            }
        };
    },
    
    _setupCursorHandlers() {
        $(document).on('mousemove', () => this.showCursor());
    }
};
