/**
 * Game State Module
 * 
 * Central state management for the entire game.
 * All shared state lives here instead of floating as globals.
 */

const GameState = {
    // ========== VERSION ==========
    LATEST_VERSION: 6,
    
    // ========== PLAYER DATA ==========
    player: {},
    
    // ========== GAME DATA (loaded from server) ==========
    maps: null,
    enemies: null,
    equipments: null,
    skills: null,
    npcs: null,
    quests: null,
    consumables: null,
    
    // ========== RUNTIME STATE ==========
    heroDirection: 1,
    keyState: { left: false, right: false },
    activeConsumables: [],
    
    // ========== DOM REFERENCES ==========
    hero: null,  // Set after DOM ready
    
    // ========== MAP STATE ==========
    mapWidth: 0,
    backWidth: 0,
    frontWidth: 0,
    
    // ========== INTERVALS ==========
    gameBeat: null,
    tutorialInterval: null,
    dialogInterval: null,
    
    // ========== COMPUTED STATS ==========
    totalWalkSpeed: 1.5,
    totalCritical: 10,
    totalAtkSpeed: 800,
    
    // ========== INITIALIZATION ==========
    
    /**
     * Load game data from server
     * @returns {Promise}
     */
    async loadGameData() {
        const response = await fetch('https://galshir.com/php/wor.php');
        const data = await response.json();
        
        this.maps = data.maps;
        this.enemies = data.enemies;
        this.equipments = data.equipments;
        this.skills = data.skills;
        this.npcs = data.npcs;
        this.quests = data.quests;
        this.consumables = data.consumables;
        
        return data;
    },
    
    /**
     * Load player from localStorage or create new
     */
    loadPlayer() {
        const saved = localStorage.getItem('player');
        this.player = saved ? JSON.parse(saved) : null;
        
        if (!this.player || this.player.version !== this.LATEST_VERSION) {
            this.resetPlayer();
        }
    },
    
    /**
     * Save player to localStorage
     */
    save() {
        localStorage.setItem('player', JSON.stringify(this.player));
    },
    
    /**
     * Reset player to default state
     */
    resetPlayer() {
        this.player = {
            version: this.LATEST_VERSION,
            backpack: { gold: 0 },
            equipments: { weapon: 'none' },
            location: 'a-box',
            position: 905,
            hp: 10,
            mp: 10,
            maxHp: 10,
            maxMp: 10,
            questsCompleted: [],
            questsAccepted: [],
            enemiesSlained: {},
            mapsVisited: [],
            criticalMultiplier: 1.5
        };
        this.save();
        location.reload();
    },
    
    /**
     * Recalculate all player stats based on equipment and consumables
     */
    recalculateStats() {
        // Base stats
        this.totalWalkSpeed = 1.5;
        this.totalCritical = 10;
        
        const weapon = this.player.equipments.weapon || 'none';
        const weaponData = this.equipments[weapon];
        this.totalAtkSpeed = 800 - (weaponData ? weaponData.attackSpeed * 50 : 0);
        
        // Equipment bonuses
        for (const slot in this.player.equipments) {
            const item = this.player.equipments[slot];
            if (item && this.equipments[item]) {
                this.totalCritical += Number(this.equipments[item].critical || 0);
            }
        }
        
        // Consumable bonuses
        this.activeConsumables.forEach(item => {
            const consumable = this.consumables[item];
            if (!consumable) return;
            
            if (consumable.effect === 'walk speed') {
                const bonus = Number(consumable.value.replace('%', '')) / 100;
                this.totalWalkSpeed += this.totalWalkSpeed * bonus;
            }
            if (consumable.effect === 'attack speed') {
                const bonus = Number(consumable.value.replace('%', '')) / 100;
                this.totalAtkSpeed = this.totalAtkSpeed * (1 - bonus);
            }
            if (consumable.effect === 'critical') {
                this.totalCritical += Number(consumable.value.replace('%', ''));
            }
        });
        
        // Minimums
        if (this.totalAtkSpeed < 200) {
            this.totalAtkSpeed = 200;
        }
    },
    
    /**
     * Initialize DOM references (call after DOM ready)
     */
    initDOMReferences() {
        this.hero = $('.hero');
    }
};
