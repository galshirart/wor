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
    rangedAttacks: null,
    penalties: null,
    
    // ========== RUNTIME STATE ==========
    heroDirection: 1,
    keyState: { left: false, right: false },
    activeConsumables: [],
    paused: false,
    soundEnabled: true,
    lastStaminaDrainTime: 0,
    
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
    // totalWalkSpeed: 1.5,
    // totalCritical: 10,
    // totalAttackSpeed: 800,
    
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
        this.rangedAttacks = data.rangedAttacks;
        this.penalties = data.penalties;
        
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
            position: Constants.INITIAL_PLAYER_POSITION,
            hp: Constants.BASE_MAX_HP,
            mp: Constants.BASE_MAX_MP,
            stamina: Constants.BASE_MAX_STAMINA,
            maxHp: Constants.BASE_MAX_HP,
            maxMp: Constants.BASE_MAX_MP,
            maxStamina: Constants.BASE_MAX_STAMINA,
            critical: Constants.BASE_CRITICAL,
            walkSpeed: Constants.BASE_WALK_SPEED,
            attackSpeed: Constants.BASE_ATTACK_SPEED,
            questsCompleted: [],
            questsAccepted: [],
            enemiesSlained: {},
            mapsVisited: [],
            reviveMap: 'a-box',
            criticalMultiplier: Constants.BASE_CRITICAL_MULTIPLIER,
            activePenalties: [],
        };
        this.save();
        location.reload();
    },
    
    /**
     * Recalculate all player stats based on equipment and consumables
     */
    recalculateStats() {
        // Base stats
        let totalWalkSpeed = Constants.BASE_WALK_SPEED;
        let totalCritical = Constants.BASE_CRITICAL;
        let totalAttackSpeed = Constants.BASE_ATTACK_SPEED;
        let totalAttack = Constants.BASE_ATTACK;
        let totalDefense = Constants.BASE_DEFENSE;
        let totalMaxHp = Constants.BASE_MAX_HP;
        let totalMaxMp = Constants.BASE_MAX_MP;
        let totalMaxStamina = Constants.BASE_MAX_STAMINA;

        // Equipment bonuses
        for (const slot in this.player.equipments) {
            const item = this.player.equipments[slot];
            if (item && this.equipments[item]) {
                totalCritical += Number(this.equipments[item].critical || 0);
                totalAttackSpeed += - Number(this.equipments[item].attackSpeed * 50 || 0);
                totalWalkSpeed += Number(this.equipments[item].walkSpeed || 0);
                totalMaxHp += Number(this.equipments[item].maxHp || 0);
                totalMaxMp += Number(this.equipments[item].maxMp || 0);
                totalMaxStamina += Number(this.equipments[item].maxStamina || 0);
                totalAttack += Number(this.equipments[item].attack || 0);
                totalDefense += Number(this.equipments[item].defense || 0);
            }
        }
        
        // Consumable bonuses
        ({ totalWalkSpeed, totalAttackSpeed: totalAttackSpeed, totalCritical } = this._calculateConsumables(totalWalkSpeed, totalAttackSpeed, totalCritical));

        // Apply penalty effects
        let stats = {
            totalWalkSpeed,
            totalAttackSpeed,
            totalCritical,
            totalAttack,
            totalDefense,
            totalMaxHp,
            totalMaxMp,
            totalMaxStamina
        };
        
        if (typeof PenaltyManager !== 'undefined') {
            stats = PenaltyManager.applyToStats(stats);
            totalWalkSpeed = stats.totalWalkSpeed;
            totalAttackSpeed = stats.totalAttackSpeed;
            totalCritical = stats.totalCritical;
            totalAttack = stats.totalAttack;
            totalDefense = stats.totalDefense;
            totalMaxHp = stats.totalMaxHp;
            totalMaxMp = stats.totalMaxMp;
            totalMaxStamina = stats.totalMaxStamina;
        }

        if (totalAttackSpeed < Constants.MIN_ATTACK_SPEED) {
            totalAttackSpeed = Constants.MIN_ATTACK_SPEED;
        }

        this.player.walkSpeed = totalWalkSpeed;
        this.player.attackSpeed = totalAttackSpeed;
        this.player.critical = totalCritical;
        this.player.maxHp = totalMaxHp;
        this.player.maxMp = totalMaxMp;
        this.player.maxStamina = totalMaxStamina;
        this.player.attack = totalAttack;
        this.player.defense = totalDefense;
    },
    
    /**
     * Initialize DOM references (call after DOM ready)
     */
    initDOMReferences() {
        this.hero = $('.hero');
    },

    /**
     * Calculate the effects of consumables on player stats
     * @param {*} totalWalkSpeed 
     * @param {*} totalAttackSpeed 
     * @param {*} totalCritical 
     * @returns 
     */

    _calculateConsumables(totalWalkSpeed, totalAttackSpeed, totalCritical) {
        this.activeConsumables.forEach(item => {
            const consumable = this.consumables[item];
            if (!consumable) return;

            if (consumable.effect === 'walk speed') {
                const bonus = Number(consumable.value.replace('%', '')) / 100;
                totalWalkSpeed += totalWalkSpeed * bonus;
            }
            if (consumable.effect === 'attack speed') {
                const bonus = Number(consumable.value.replace('%', '')) / 100;
                totalAttackSpeed = totalAttackSpeed * (1 - bonus);
            }
            if (consumable.effect === 'critical') {
                totalCritical += Number(consumable.value.replace('%', ''));
            }
        });
        return { totalWalkSpeed, totalAttackSpeed, totalCritical };
    }
}

