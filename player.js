/**
 * Player Module
 * 
 * Handles player character: movement, jumping, items, equipment, stats display.
 */

const Player = {
    // ========== MODE MANAGEMENT ==========
    
    /**
     * Get current player mode
     * @returns {string} Current mode (rest, walk, jump, fight, block)
     */
    getMode() {
        return GameState.hero.attr('mode');
    },
    
    /**
     * Set player mode and update animations
     * @param {string} newMode 
     */
    setMode(newMode) {
        const state = GameState;
        const hero = state.hero;
        
        if (newMode) {
            hero.attr('mode', newMode);
            hero.find('.equipment').attr('mode', newMode);
        }
        
        const durations = {
            walk: 400 / state.player.walkSpeed + 'ms',
            rest: '2000ms',
            jump: '800ms',
            fight: state.player.attackSpeed + 'ms',
            block: '200ms',
        };
        
        if (durations[newMode]) {
            $(`[mode=${newMode}]`).css('animation-duration', durations[newMode]);
            $(`[mode=${newMode}] *`).css('animation-duration', durations[newMode]);
            
            if (newMode === 'rest') {
                hero.find('.weapon').css('animation-duration', '400ms');
            }
        }
    },
    
    // ========== BLOCKING ==========
    
    // Interval for draining stamina while blocking
    blockDrainInterval: null,
    
    /**
     * Start blocking
     */
    startBlock() {
        const state = GameState;
        if (this.getMode() === 'fight' || this.getMode() === 'jump' || state.isBlocking) {
            return;
        }
        if (!state.player.equipments.shield) {
            return;
        }
        
        // Check if player has stamina to block
        if (state.player.stamina <= 0) {
            UI.shake($('.bar.stamina'));
            return;
        }
        
        state.isBlocking = true;
        state.blockDirection = state.heroDirection;  // Lock direction when starting block
        this.setMode('block');
        
        // Start draining stamina while blocking
        const drainPerTick = Constants.STAMINA_DRAIN_RATE / 60; // 60 ticks per second
        this.blockDrainInterval = setInterval(() => {
            state.player.stamina -= drainPerTick;
            
            // Update stamina bar immediately for smooth drain
            $('.bar.stamina').find('.fill').css('width', state.player.stamina / state.player.maxStamina * 100 + '%');
            
            // Stop blocking when stamina runs out
            if (state.player.stamina <= 0) {
                state.player.stamina = 0;
                state.lastStaminaDrainTime = Date.now(); // Only delay recovery if it hit 0
                this.stopBlock();
            }
        }, 1000 / 60);
    },
    
    /**
     * Stop blocking
     */
    stopBlock() {
        const state = GameState;
        if (!state.isBlocking) {
            return;
        }
        
        // Clear the stamina drain interval
        if (this.blockDrainInterval) {
            clearInterval(this.blockDrainInterval);
            this.blockDrainInterval = null;
        }
        
        state.isBlocking = false;
        this.setMode('rest');
    },
    
    // ========== MOVEMENT ==========
    
    /**
     * Execute a jump
     */
    jump() {
        if (this.getMode() === 'fight' || this.getMode() === 'jump' || Combat.skillCooldown) {
            return;
        }
        
        this.setMode('jump');
        GameState.hero.addClass('jumping');
        
        setTimeout(() => GameState.hero.removeClass('jumping'), Constants.JUMP_APEX_MS);
        setTimeout(() => {
            this.setMode('rest');
            sound('land');
        }, Constants.JUMP_DURATION_MS);
        
        sound('jump');
    },
    
    /**
     * Handle projectile movement (called in game loop)
     */
    updateProjectiles() {
        $('.projectile').each(function() {
            const projectile = $(this);
            const x1 = i(projectile, 'left');
            const x2 = x1 + i(projectile, 'width');
            const projectileSpeed = Number(projectile.attr('speed'));
            const direction = Number(projectile.attr('direction'));
            
            projectile.css('left', x1 + direction * projectileSpeed + 'px');
            
            if (Math.abs(x1 - Number(projectile.attr('originX'))) > Number(projectile.attr('range'))) {
                projectile.remove();
                return;
            }
            
            $('.enemy[active=true][hitable=TRUE]').each(function() {
                const enemy = $(this);
                if (x1 > i(enemy, 'left') + i(enemy, 'width') || x2 < i(enemy, 'left')) {
                    return;
                }
                Combat.hit(enemy, Number(projectile.attr('attack')));
                projectile.remove();
                return false;
            });
        });
    },
    
    // ========== ITEMS ==========
    
    /**
     * Pick up nearby items
     */
    pickUp() {
        if (this.getMode() === 'fight' || this.getMode() === 'jump' || Combat.attackCooldown) {
            return;
        }
        
        const state = GameState;
        
        $('.field .item').not('.picked').each(function() {
            const item = $(this);
            const itemLeft = i(item, 'left');
            const itemWidth = i(item, 'width');
            
            if (state.player.position + Constants.ITEM_PICKUP_RANGE < itemLeft ||
                state.player.position - Constants.ITEM_PICKUP_RANGE > itemLeft + itemWidth) {
                return;
            }
            
            item.addClass('picked');
            
            const itemType = item.attr('type');
            const amount = Number(item.attr('amount'));
            
            if (itemType === 'gold') {
                UI.log('Picked ' + amount + ' gold', 'gold');
            } else {
                UI.log('Picked ' + itemType, itemType);
            }
            
            Player.acquire(itemType, amount);
            
            setTimeout(() => item.remove(), Constants.ITEM_PICKUP_ANIMATION_MS);
            return false;
        });
    },
    
    /**
     * Add item to inventory
     * @param {string} item - Item type
     * @param {number} amount - Amount to add
     */
    acquire(item, amount = 1) {
        const state = GameState;
        
        if (item === 'gold') {
            sound('pickup-gold');
        } else {
            sound('pickup-item');
        }
        
        state.player.backpack[item] = (state.player.backpack[item] || 0) + amount;
        UI.setBackpack();
        UI.setConsumables();
    },
    
    /**
     * Equip or unequip an item
     * @param {string} item - Item to equip
     */
    equip(item) {
        const state = GameState;
        
        if (!state.equipments.hasOwnProperty(item)) {
            return;
        }
        
        const category = state.equipments[item].category;
        const isEquipped = state.player.equipments[category] === item;
        
        state.player.equipments[category] = isEquipped ? '' : item;
        sound('heavy-item');
        UI.log((isEquipped ? 'unequipped ' : 'equipped ') + item, item);
        
        this.setHero();
        
        // Clean up empty equipment slots
        for (const slot in state.player.equipments) {
            if (state.player.equipments[slot] === '') {
                delete state.player.equipments[slot];
            }
        }
        
        UI.setBackpack();
        GameState.recalculateStats();
    },
    
    /**
     * Use a consumable item
     * @param {number} slot - Consumable slot (1-9)
     */
    consume(slot) {
        const state = GameState;

        //prevent consuming if sell menu is open (to allow typing amount in sell menu)
        if ($('.card.npc.sell').is(':visible')) { return; }

        const itemType = $('.consumables .icon:nth-child(' + slot + ')').attr('type');
        
        if (!itemType) return;
        
        // Check if already active
        if (state.activeConsumables.includes(itemType)) {
            UI.shake($('.consumables'));
            return;
        }
        
        const consumable = state.consumables[itemType];
        
        // Check if same effect already active
        for (let i = state.activeConsumables.length - 1; i >= 0; i--) {
            const active = state.activeConsumables[i];
            if (state.consumables[active].effect === consumable.effect) {
                state.activeConsumables.splice(i, 1);
            }
        }
        
        // Apply effect
        if (consumable.effect === 'hp recover') {
            if (state.player.hp >= state.player.maxHp) {
                UI.shake($('.bar.hp').parent('.bar-container'));
                return;
            }
            state.player.hp = Math.min(state.player.hp + Number(consumable.value), state.player.maxHp);
        }
        
        if (consumable.effect === 'mp recover') {
            if (state.player.mp >= state.player.maxMp) {
                UI.shake($('.bar.mp').parent('.bar-container'));
                return;
            }
            state.player.mp = Math.min(state.player.mp + Number(consumable.value), state.player.maxMp);
        }
        
        // Handle duration-based consumables
        if (consumable.duration > 0) {
            state.activeConsumables.push(itemType);
            GameState.recalculateStats();
            
            setTimeout(() => {
                const index = state.activeConsumables.indexOf(itemType);
                if (index > -1) {
                    state.activeConsumables.splice(index, 1);
                }
                $('.consumables .icon[type=' + itemType + ']').removeClass('active');
                GameState.recalculateStats();
                UI.setConsumables();
            }, consumable.duration * 60000);
        }
        
        UI.log(consumable.effect + ' +' + consumable.value, itemType);
        
        state.player.backpack[itemType]--;
        UI.setBackpack();
        UI.setConsumables();
        sound('bless');
    },
    
    // ========== HERO SETUP ==========
    
    /**
     * Set up hero visual elements based on equipment
     */
    setHero() {
        const state = GameState;
        const hero = state.hero.html('');
        
        if (state.player.equipments.shield) {
            hero.append('<div style="background-image:url(assets/shield-' + state.player.equipments.shield + '.webp)" class="equipment"/>');
        }
        
        if (state.player.equipments.hat) {
            hero.append('<div style="background-image:url(assets/hat-' + state.player.equipments.hat + '.webp)" class="equipment"/>');
        }
        
        if (!state.player.equipments.weapon) {
            state.player.equipments.weapon = 'none';
        }
        
        const weapon = state.equipments[state.player.equipments.weapon];
        
        if (weapon.type === 'melee') {
            hero.append('<div class="weapon" name="' + state.player.equipments.weapon + '"><img src="assets/weapon-' + state.player.equipments.weapon + '.webp" /></div>');
        }
        
        if (weapon.type === 'range') {
            hero.append('<div class="weapon range"></div>');
            hero.find('.weapon')
                .css('background-image', 'url(assets/weapon-' + state.player.equipments.weapon + '.webp)')
                .attr('type', 'range');
        }
        
        this.setMode('walk');
        setTimeout(() => this.setMode('rest'));
    },
    
    /**
     * Recover HP and MP over time (called in game loop)
     */
    recover() {
        const state = GameState;
        
        state.player.hp = Math.min(
            state.player.hp + state.player.maxHp * Constants.HP_RECOVERY_RATE,
            state.player.maxHp
        );
        state.player.mp = Math.min(
            state.player.mp + state.player.maxMp * Constants.MP_RECOVERY_RATE,
            state.player.maxMp
        );
        
        // Recover stamina only when not blocking and after delay
        if (!state.isBlocking && Date.now() - state.lastStaminaDrainTime > Constants.STAMINA_RECOVERY_DELAY_MS) {
            state.player.stamina = Math.min(
                state.player.stamina + state.player.maxStamina * Constants.STAMINA_RECOVERY_RATE,
                state.player.maxStamina
            );
        }
        
        if (state.player.hp <= 0) { 
		    this.heroDeath();
	    }
        
        // Update UI
        $('.bar.hp').find('.value').html(Math.floor(state.player.hp));
        $('.bar.hp').find('.fill').css('width', state.player.hp / state.player.maxHp * 100 + '%');
        $('.bar.mp').find('.value').html(Math.floor(state.player.mp));
        $('.bar.mp').find('.fill').css('width', state.player.mp / state.player.maxMp * 100 + '%');
        $('.bar.stamina').find('.fill').css('width', state.player.stamina / state.player.maxStamina * 100 + '%');
    },
    /**
     * Handle hero death
     */
    heroDeath() {
        const state = GameState;
        hero.css('transform', 'scale(' + heroDirection + ', 1) rotate(-90deg) translate(-21px, -14px)');
        state.heroDeath = true;
             
        sound('squeak-3');
        state.player.hp = 0;
        Player.stopBlock();
        DeathUI.showDeathCard();
    },

};

// Legacy alias
const mode = (m) => m ? Player.setMode(m) : Player.getMode();
