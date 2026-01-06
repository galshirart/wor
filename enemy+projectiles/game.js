/**
 * Game Module
 * 
 * Main entry point and initialization.
 */

const Game = {
    /**
     * Initialize the game
     */
    async init() {
        try {
            // Load game data from server
            await GameState.loadGameData();
            
            // Load or create player
            GameState.loadPlayer();
            
            // Initialize DOM references
            GameState.initDOMReferences();
            
            // Calculate initial stats
            GameState.recalculateStats();
            
            // Set up player visuals
            Player.setHero();
            
            // Set up UI
            UI.setBackpack();
            UI.setConsumables();
            
            // Set up input handlers
            Input.init();
            
            // Enter the current map
            MapManager.enter();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    },
    
    /**
     * Save game state
     */
    save() {
        GameState.save();
    },
    
    /**
     * Debug: Show attack range
     * @param {number} x1 - Start X
     * @param {number} x2 - End X
     */
    showRange(x1, x2) {
        const range = $('<div class="range" style="position:absolute; bottom:330px; z-index:100; background:red; opacity:0.3; height:40px"></div>');
        range.css('width', Math.abs(x2 - x1));
        range.css('left', x1);
        $('.field').append(range);
        setTimeout(() => range.remove(), 1000);
    },
    
    /**
     * Debug: Set attack pose
     * @param {number} atkType - Attack type
     */
    pose(atkType) {
        Player.setMode('fight');
        GameState.hero.attr('atkType', atkType);
        $('.hero, .weapon').css('animation-duration', '4000ms');
        $('.weapon').css('animation-name', 'weapon-' + atkType);
    },
    
    /**
     * Debug: Give player items
     */
    shefa() {
        Player.acquire('wood-sword');
        Player.acquire('wood-bow');
        Player.acquire('wood-shield');
        Player.acquire('red-bandana');
        Player.acquire('coconut-water', 20);
        Player.acquire('speed-potion', 20);
        Player.acquire('turbo-berry', 20);
        Player.acquire('focus-potion', 20);
        $('.card.backpack').show();
    }
};

// Start the game when the script loads
Game.init();

// Legacy aliases
const save = () => Game.save();
const showRange = (x1, x2) => Game.showRange(x1, x2);
const pose = (atkType) => Game.pose(atkType);
const shefa = () => Game.shefa();
const resetPlayer = () => GameState.resetPlayer();
const setStats = () => GameState.recalculateStats();

// Expose commonly needed state as legacy globals for gradual migration
// These will be removed once all code uses GameState directly
Object.defineProperty(window, 'player', {
    get: () => GameState.player,
    set: (val) => { GameState.player = val; }
});

Object.defineProperty(window, 'hero', {
    get: () => GameState.hero,
    set: (val) => { GameState.hero = val; }
});

Object.defineProperty(window, 'heroDirection', {
    get: () => GameState.heroDirection,
    set: (val) => { GameState.heroDirection = val; }
});

Object.defineProperty(window, 'maps', {
    get: () => GameState.maps
});

Object.defineProperty(window, 'enemies', {
    get: () => GameState.enemies
});

Object.defineProperty(window, 'equipments', {
    get: () => GameState.equipments
});

Object.defineProperty(window, 'skills', {
    get: () => GameState.skills
});

Object.defineProperty(window, 'npcs', {
    get: () => GameState.npcs
});

Object.defineProperty(window, 'quests', {
    get: () => GameState.quests
});

Object.defineProperty(window, 'consumables', {
    get: () => GameState.consumables
});

Object.defineProperty(window, 'totalAtkSpeed', {
    get: () => GameState.totalAtkSpeed
});

Object.defineProperty(window, 'totalCritical', {
    get: () => GameState.totalCritical
});

Object.defineProperty(window, 'totalWalkSpeed', {
    get: () => GameState.totalWalkSpeed
});

Object.defineProperty(window, 'mapWidth', {
    get: () => GameState.mapWidth,
    set: (val) => { GameState.mapWidth = val; }
});
