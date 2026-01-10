/**
 * Game Constants
 * 
 * All magic numbers extracted and named.
 * Organized by category for easy discovery.
 */

const Constants = {
    // ========== POSITIONING ==========
    GROUND_Y: 321,              // Base Y position for ground-level objects
    HERO_GROUND_Y: 321,         // Hero's bottom position
    FIELD_HEIGHT: 800,          // Total field height
    
    // Map boundaries
    MAP_EDGE_BUFFER: 610,       // Distance from edge where player stops
    PORT_X_OFFSET: 590,         // Base X offset for ports
    MAP_EDGE_CALCULATION: 1270, // Used in port position calculation
    
    // NPC positioning
    NPC_GROUND_Y: 330,
    NPC_INTERACTION_RANGE: 60,

    // TELEPORT
    PLAYER_POSITION_X: 630,
    INITIAL_PLAYER_POSITION: 905,
    // ========== COMBAT ==========
    PROJECTILE_SPEED: 10,
    PROJECTILE_RANGE: 500,
    PROJECTILE_WIDTH: 80,
    ENEMY_PROJECTILE_MIN_DISTANCE: 80,
    
    HERO_KNOCKBACK: 2,
    
    DAMAGE_SPREAD: 20,          // Percent variance in damage
    DAMAGE_IMMUNITY_MS: 1000,   // Invulnerability after hit
    
    HIT_DISPLAY_MS: 800,        // How long damage numbers show
    
    // ========== STATS ==========
    BASE_ATTACK: 0,
    BASE_DEFENSE: 0,
    BASE_MAX_HP: 10,
    BASE_MAX_MP: 10,
    BASE_CRITICAL: 10,                
    BASE_WALK_SPEED: 1.5,
    BASE_ATTACK_SPEED: 800,
    BASE_CRITICAL_MULTIPLIER: 1.5,
    
    // ========== MINIMUM STATS ==========
    MIN_ATTACK_SPEED: 200,

    // ========== TIMING ==========
    SKILL_DURATION_MS: 600,
    JUMP_DURATION_MS: 790,
    JUMP_APEX_MS: 400,          // When jump reaches highest point
    
    ENEMY_RESPAWN_MIN_MS: 10000,
    ENEMY_RESPAWN_MAX_MS: 20000,
    
    DIALOG_CHAR_DELAY_MS: 28,   // Typewriter effect speed
    DIALOG_LINE_PAUSE_MS: 400,  // Pause between dialog lines
    
    // ========== RECOVERY ==========
    HP_RECOVERY_RATE: 0.0001,   // Per game tick, as fraction of max
    MP_RECOVERY_RATE: 0.0003,
    
    // ========== ANIMATION ==========
    MODE_DURATIONS: {
        walk: 400,  
        rest: 2000,
        jump: 800,
        fight: 800   
    },
    
    // ========== UI ==========
    LOG_DISPLAY_MS: 6000,
    ZOOM_TRANSITION_MS: 500,
    OVERLAY_FADE_MS: 100,
    
    // ========== ENEMY BEHAVIOR ==========
    ENEMY_WANDER_RANGE: 300,
    ENEMY_STAND_MIN_MS: 1000,
    ENEMY_STAND_MAX_MS: 4000,
    ENEMY_SPEED_VARIANCE: 30,
    
    ENEMY_MIN_X: 600,
    ENEMY_SPAWN_MIN_X: 800,
    
    // ========== ITEMS ==========
    ITEM_FLOAT_DURATION_MS: 2000,
    ITEM_PICKUP_RANGE: 20,
    ITEM_PICKUP_ANIMATION_MS: 400,
    
    // ========== BLOCKING ==========
    BLOCK_DAMAGE_REDUCTION: 0.7,  // 70% damage reduction while blocking
    BLOCK_WALK_SPEED_MULT: 0.3,   // 30% walk speed while blocking
    BLOCK_KNOCKBACK_REDUCTION: 0.5, // 50% knockback reduction while blocking

    // ========== KEYS ==========
    KEYS: {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        ATTACK: 65,       // A
        BLOCK: 83,        // S
        SKILL_W: 87,      // W
        SKILL_D: 68,      // D
        PICKUP: 90,       // Z
        INTERACT: 32,     // Space
        BACKPACK: 66,     // B
        QUESTS: 81,       // Q
        ESCAPE: 27,
        NUM_1: 49,
        NUM_2: 50,
        NUM_3: 51,
        NUM_4: 52,
        NUM_5: 53,
        NUM_6: 54,
        NUM_7: 55,
        NUM_8: 56,
        NUM_9: 57
    }
};
