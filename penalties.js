/**
 * Penalty Manager Module
 * 
 * Handles death penalties: selection, application, timing, and stat modifications.
 */

const PenaltyManager = {
    /**
     * Get random penalties with category diversity
     * @param {number} count - Number of penalties to select
     * @returns {Array} Array of penalty objects with their IDs
     */
    getRandomPenalties(count = 3) {
        const state = GameState;
        const penalties = state.penalties;

        // Group penalties by category
        const byCategory = {};
        for (const id in penalties) {
            const penalty = penalties[id];
            if (penalty && penalty.active === "TRUE") {
                if (!byCategory[penalty.category]) {
                    byCategory[penalty.category] = [];
                }
                byCategory[penalty.category].push({ id, ...penalty });
            }
        }
        
        const categories = Object.keys(byCategory);
        const selected = [];
        const usedCategories = new Set();
        
        // First pass: pick one from different categories
        while (selected.length < count && usedCategories.size < categories.length) {
            // Pick a random unused category
            const availableCategories = categories.filter(c => !usedCategories.has(c));
            if (availableCategories.length === 0) break;
            
            const category = availableCategories[random(0, availableCategories.length - 1)];
            const penaltiesInCategory = byCategory[category];
            
            // Pick a random penalty from this category that hasn't been selected
            const available = penaltiesInCategory.filter(p => !selected.find(s => s.id === p.id));
            if (available.length > 0) {
                const penalty = available[random(0, available.length - 1)];
                selected.push(penalty);
                usedCategories.add(category);
            }
        }
        
        // Second pass: if we still need more, allow duplicates from categories
        if (selected.length < count) {
            const allPenalties = Object.entries(activePenalties).map(([id, p]) => ({ id, ...p }));
            const remaining = allPenalties.filter(p => !selected.find(s => s.id === p.id));
            
            while (selected.length < count && remaining.length > 0) {
                const index = random(0, remaining.length - 1);
                selected.push(remaining[index]);
                remaining.splice(index, 1);
            }
        }
        
        return selected;
    },

    /**
     * Get (and persist) a locked set of penalty choices.
     * Used so reopening the NPC dialog doesn't reshuffle.
     * 
     * @param {string} lockKey - Stable key (e.g., npcName)
     * @param {number} count - Number of penalties to lock
     * @returns {Array} Array of penalty objects with their IDs
     */
    getLockedPenalties(lockKey, count = 3) {
        const state = GameState;
        if (!state.player) return [];
        if (!state.player.lockedChoices) state.player.lockedChoices = {};

        const existing = state.player.lockedChoices[lockKey];
        if (Array.isArray(existing) && existing.length > 0) {
            // Map ids back to current penalty objects (in case DB values changed)
            return existing
                .map(id => state.penalties && state.penalties[id] ? ({ id, ...state.penalties[id] }) : null)
                .filter(Boolean);
        }

        const selected = this.getRandomPenalties(count);
        state.player.lockedChoices[lockKey] = selected.map(p => p.id);
        GameState.save();
        return selected;
    },
    
    /**
     * Apply a penalty to the player
     * @param {string} penaltyId - ID of the penalty to apply
     */
    apply(penaltyId) {
        const state = GameState;
    const penalty = state.penalties && state.penalties[penaltyId];

    if (!penalty) {
        console.error('Penalty not found:', penaltyId);
        return;
    }

        if (penalty.type === 'instant') {
            this._applyInstant(penaltyId, penalty);
        } else if (penalty.type === 'timed') {
            this._applyTimed(penaltyId, penalty);
        }
        
        // Recalculate stats to apply any stat-based penalties
        GameState.recalculateStats();
        GameState.save();
    },
    
    /**
     * Apply an instant penalty (one-time effect)
     * @param {string} penaltyId - Penalty ID
     * @param {Object} penalty - Penalty data
     */
    _applyInstant(penaltyId, penalty) {
        const state = GameState;
        
        if (penalty.effect === 'gold') {
            if (penalty.operator === 'percent') {
                const loss = Math.floor(state.player.backpack.gold * (penalty.value / 100));
                state.player.backpack.gold -= loss;
                UI.log('Lost ' + loss + ' gold', 'gold');
            } else if (penalty.operator === 'flat') {
                const loss = Math.min(penalty.value, state.player.backpack.gold);
                state.player.backpack.gold -= loss;
                UI.log('Lost ' + loss + ' gold', 'gold');
            }
            
            // Ensure gold doesn't go negative
            if (state.player.backpack.gold < 0) {
                state.player.backpack.gold = 0;
            }
            
            UI.setBackpack();
        }
    },
    
    /**
     * Apply a timed penalty (duration-based effect)
     * @param {string} penaltyId - Penalty ID
     * @param {Object} penalty - Penalty data
     */
    _applyTimed(penaltyId, penalty) {
        const state = GameState;
        
        // Initialize activePenalties array if needed
        if (!state.player.activePenalties) {
            state.player.activePenalties = [];
        }
        
        // Check if this penalty is already active
        const existingIndex = state.player.activePenalties.findIndex(p => p.id === penaltyId);
        if (existingIndex >= 0) {
            // Refresh the duration
            state.player.activePenalties[existingIndex].remainingMs = penalty.duration * 60 * 1000;
        } else {
            // Add new penalty
            state.player.activePenalties.push({
                id: penaltyId,
                remainingMs: penalty.duration * 60 * 1000  // Convert minutes to milliseconds
            });
        }
        
        UI.log(penalty.name + ' applied', 'slain');
    },
    
    /**
     * Get all currently active (non-expired) penalties
     * @returns {Array} Array of active penalty objects
     */
    getActivePenalties() {
        const state = GameState;
        
        if (!state.player.activePenalties) {
            return [];
        }
        
        return state.player.activePenalties.filter(p => p.remainingMs > 0);
    },
    
    /**
     * Update penalty timers (called from game loop)
     * @param {number} deltaMs - Milliseconds since last update
     */
    updateTimers(deltaMs) {
        const state = GameState;
        
        if (!state.player.activePenalties || state.player.activePenalties.length === 0) {
            return;
        }
        
        // Check if player is in a safe zone (revive map)
        const currentMap = state.maps[state.player.location];
        if (currentMap && currentMap.isReviveMap === "TRUE") {
            // Don't tick timers in safe zones
            return;
        }
        
        let needsRecalculate = false;
        
        // Tick down all penalty timers
        for (let i = state.player.activePenalties.length - 1; i >= 0; i--) {
            const activePenalty = state.player.activePenalties[i];
            activePenalty.remainingMs -= deltaMs;
            if (activePenalty.remainingMs <= 0) {
                // Penalty expired
                const penalty = state.penalties[activePenalty.id];
                if (penalty) {
                    UI.log(penalty.name + ' expired', 'slain');
                }
                state.player.activePenalties.splice(i, 1);
                needsRecalculate = true;
            }
        }
        
        if (needsRecalculate) {
            GameState.recalculateStats();
        }
    },
    
    /**
     * Apply active penalties to stats (called by recalculateStats)
     * @param {Object} stats - Stats object to modify
     * @returns {Object} Modified stats object
     */
    applyToStats(stats) {
        const state = GameState;
        
        if (!state.player.activePenalties || !state.penalties) {
            return stats;
        }
        
        for (const activePenalty of state.player.activePenalties) {
            if (activePenalty.remainingMs <= 0) continue;
            
            const penalty = state.penalties[activePenalty.id];
            if (!penalty || penalty.type !== 'timed') continue;
            
            const effect = penalty.effect;
            const value = penalty.value;
            const operator = penalty.operator;
            
            // Map penalty effects to stat names
            const statMapping = {
                'attack': 'totalAttack',
                'defense': 'totalDefense',
                'walkSpeed': 'totalWalkSpeed',
                'attackSpeed': 'totalAttackSpeed',
                'critical': 'totalCritical',
                'maxHp': 'totalMaxHp',
                'maxMp': 'totalMaxMp',
                'maxStamina': 'totalMaxStamina'
            };
            
            const statKey = statMapping[effect];
            if (!statKey || stats[statKey] === undefined) continue;
            
            if (operator === 'percent') {
                // Reduce by percentage (penalties are negative effects)
                stats[statKey] = stats[statKey] * (1 - value / 100);
            } else if (operator === 'flat') {
                stats[statKey] -= value;
            } else if (operator === 'multiply') {
                stats[statKey] *= value;
            }
        }
        
        return stats;
    },
    
    /**
     * Clean up expired penalties
     */
    cleanupExpired() {
        const state = GameState;
        
        if (!state.player.activePenalties) {
            return;
        }
        
        state.player.activePenalties = state.player.activePenalties.filter(p => p.remainingMs > 0);
    },
    
    /**
     * Format penalty description with values
     * @param {Object} penalty - Penalty object
     * @returns {string} Formatted description
     */
    formatDescription(penalty) {
        let desc = penalty.description;
        desc = desc.replace('{value}', penalty.value);
        desc = desc.replace('{duration}', penalty.duration);
        return desc;
    }
};
