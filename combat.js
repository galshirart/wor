/**
 * Combat Module
 * 
 * Handles all combat-related functionality: attacks, skills, hits, collisions.
 */

const Combat = {
    // ========== STATE ==========
    attackCooldown: false,
    skillCooldown: false,
    
    // ========== MAIN FUNCTIONS ==========
    
    /**
     * Execute a basic attack
     * @param {number} atkType - Animation type (1-6)
     * @param {number} rangeStart - Attack range start offset
     * @param {number} rangeEnd - Attack range end offset  
     * @param {number} atkMultiplier - Damage multiplier
     * @param {number} maxTargets - Max enemies to hit
     */
    fight(atkType = random(1, 5), rangeStart = 0, rangeEnd = 0, atkMultiplier = 1, maxTargets = 1) {
        const state = GameState;
        const hero = state.hero;
        
        if (Player.getMode() === 'fight' || Player.getMode() === 'jump' || this.attackCooldown) {
            return;
        }
        
        this.attackCooldown = true;
        Player.setMode('fight');
        
        const weapon = state.equipments[state.player.equipments.weapon];
        
        if (weapon.type === 'melee') {
            this._executeMeleeAttack(rangeStart, rangeEnd, atkMultiplier);
        } else if (weapon.type === 'range') {
            this._executeRangedAttack(atkMultiplier, maxTargets);
            atkType = 6;
        }
        
        this._playAttackAnimation(atkType);
    },
    
    /**
     * Use a skill ability
     * @param {string} key - Skill key ('s' or 'd')
     */
    useSkill(key) {
        const state = GameState;
        
        if (Player.getMode() === 'fight' || Player.getMode() === 'jump' || this.skillCooldown) {
            return;
        }
        
        const skillName = this._getSkillFromKey(key);
        if (!skillName) return;
        
        const skill = state.skills[skillName];
        const weapon = state.equipments[state.player.equipments.weapon];
        const mpCost = (weapon.attack * skill.atkMultiplier) / 2;
        
        if (state.player.mp < mpCost) {
            UI.shake($('.bar.mp').parent('.bar-container'));
            return;
        }
        
        state.player.mp -= mpCost;
        this.skillCooldown = true;
        
        this._executeSkill(skillName, skill, weapon);
    },
    
    /**
     * Apply a hit to an enemy
     * @param {jQuery} enemyElement - The enemy DOM element
     * @param {number} baseAttack - Base attack damage
     */
    hit(enemyElement, baseAttack) {
        const state = GameState;
        const { finalDamage, isCritical } = this._calculateDamage(baseAttack);
        const enemyType = enemyElement.attr('type');
        const knockback = this._calculateKnockback(finalDamage, enemyType);
        
        this._applyHitToEnemy(enemyElement, finalDamage, knockback);
        this._showDamageNumber(enemyElement, finalDamage, isCritical);
        this._handleEnemyPostHit(enemyElement);
        
        sound('hit-1');
    },
    
    /**
     * Check and handle player collision with enemies
     */
    checkCollisions() {
        const self = this;
        const state = GameState;
        
        $('.enemy[active=true]').each(function() {
            const enemyElement = $(this);
            
            if (self._isCollisionIgnored(enemyElement)) {
                return;
            }
            
            const damage = self._calculateDamageTaken(enemyElement);
            self._applyDamageToPlayer(damage);
        });
    },
    
    // ========== PRIVATE HELPERS ==========
    
    _executeMeleeAttack(rangeStart, rangeEnd, atkMultiplier) {
        const state = GameState;
        const weaponHeight = i('.weapon', 'height');
        let x1, x2;
        
        if (state.heroDirection === 1) {
            x1 = state.player.position + rangeStart;
            x2 = state.player.position + rangeEnd + weaponHeight;
        } else {
            x1 = state.player.position - weaponHeight - rangeEnd;
            x2 = state.player.position - rangeStart;
        }
        
        setTimeout(() => sound('attack'), state.totalAtkSpeed / 4);
        
        setTimeout(() => {
            this._hitEnemiesInRange(x1, x2, atkMultiplier);
        }, state.totalAtkSpeed / 2);
    },
    
    _executeRangedAttack(atkMultiplier, maxTargets) {
        const state = GameState;
        
        setTimeout(() => sound('bow'), state.totalAtkSpeed / 4);
        
        setTimeout(() => {
            this._spawnProjectile(atkMultiplier, maxTargets);
        }, state.totalAtkSpeed / 2);
    },
    
    _hitEnemiesInRange(x1, x2, atkMultiplier) {
        const state = GameState;
        const weapon = state.equipments[state.player.equipments.weapon];
        const self = this;
        
        $('.enemy[active=true][hitable=TRUE]').each(function() {
            const enemyElement = $(this);
            const enemyLeft = i(enemyElement, 'left');
            const enemyRight = enemyLeft + i(enemyElement, 'width');
            
            if (x1 > enemyRight || x2 < enemyLeft) {
                return;
            }
            
            self.hit(enemyElement, weapon.attack * atkMultiplier);
            return false;
        });
    },
    
    _spawnProjectile(atkMultiplier, maxTargets) {
        const state = GameState;
        const weapon = state.equipments[state.player.equipments.weapon];
        
        $('<div class="projectile"></div>')
            .appendTo('.field')
            .css({
                'transform': 'scaleX(' + state.heroDirection + ')',
                'left': state.player.position + state.heroDirection * 40 - 40,
                'width': Constants.PROJECTILE_WIDTH
            })
            .attr({
                'direction': state.heroDirection,
                'range': Constants.PROJECTILE_RANGE,
                'originX': state.player.position,
                'speed': Constants.PROJECTILE_SPEED,
                'attack': weapon.attack * atkMultiplier,
                'maxTargets': maxTargets
            });
    },
    
    _playAttackAnimation(atkType) {
        const state = GameState;
        
        state.hero.attr('atkType', atkType);
        $('.weapon').css('animation-name', 'weapon-' + atkType);
        
        setTimeout(() => {
            Player.setMode('rest');
            $('.weapon').css('animation-name', '');
            
            setTimeout(() => {
                this.attackCooldown = false;
            }, state.totalAtkSpeed / 4);
        }, state.totalAtkSpeed);
    },
    
    _getSkillFromKey(key) {
        const skillMap = { 's': 'surge', 'd': 'impact' };
        return skillMap[key] || null;
    },
    
    _executeSkill(skillName, skill, weapon) {
        const state = GameState;
        
        const skillSprite = $('<div class="skill"></div>').css({
            'transform': 'scaleX(' + state.heroDirection + ')',
            'background-image': 'url(assets/skill-' + skillName + '.webp)'
        });
        
        if (skillName === 'surge' && weapon.type === 'melee') {
            state.player.position += state.heroDirection * 100;
            this.fight(1, 0, 120, skill.atkMultiplier, 2);
            sound('swoosh');
            state.hero.after(skillSprite);
        }
        
        if (skillName === 'impact' && weapon.type === 'melee') {
            this.fight(6, -100, 80, skill.atkMultiplier, 6);
            sound('spell-1');
            setTimeout(() => {
                state.hero.after(skillSprite);
                UI.shake($('.field'));
                sound('rumble');
            }, 200);
        }
        
        setTimeout(() => {
            Player.setMode('rest');
            state.hero.css('transform', 'scaleX(' + state.heroDirection + ') translateX(0)');
            $('.skill').remove();
            this.skillCooldown = false;
        }, Constants.SKILL_DURATION_MS);
    },
    
    _calculateDamage(baseAttack) {
        const state = GameState;
        let finalDamage = spread(baseAttack, Constants.DAMAGE_SPREAD);
        const isCritical = random(1, 100) <= state.totalCritical;
        
        if (isCritical) {
            finalDamage = Math.round(finalDamage * state.player.criticalMultiplier);
        }
        
        return { finalDamage, isCritical };
    },
    
    _calculateKnockback(damage, enemyType) {
        const enemy = GameState.enemies[enemyType];
        const enemySize = enemy.size[0] + enemy.size[1];
        const knockbackRaw = (damage / enemySize) * 100;
        
        return Math.max(Constants.KNOCKBACK_MIN, Math.min(Constants.KNOCKBACK_MAX, knockbackRaw));
    },
    
    _applyHitToEnemy(enemyElement, damage, knockback) {
        const state = GameState;
        const currentHp = Number(enemyElement.attr('hp'));
        const hitCount = Number(enemyElement.attr('hit-count'));
        const enemyType = enemyElement.attr('type');
        
        enemyElement.attr({
            'state': 'enemy-hit',
            'angry': 'true',
            'hp': currentHp - damage,
            'hit-count': hitCount + 1
        }).css({
            'transition-duration': '50ms',
            'transition-timing-function': 'ease-out',
            'left': i(enemyElement, 'left') + state.heroDirection * knockback + 'px'
        });
        
        const hpPercent = (currentHp - damage) / state.enemies[enemyType].hp * 100;
        enemyElement.find('.bar').css('width', hpPercent + '%');
    },
    
    _showDamageNumber(enemyElement, damage, isCritical) {
        const color = isCritical ? 'orange' : 'yellow';
        const cssClass = 'hit' + (isCritical ? ' critical' : '');
        const leftPos = i(enemyElement, 'left') + i(enemyElement, 'width') / 2 - (String(damage).length * 13);
        
        const hitDigits = $('<div class="' + cssClass + '">' + prettyNumber(damage, color) + '</div>')
            .css('left', leftPos)
            .appendTo('.field');
        
        setTimeout(() => hitDigits.remove(), Constants.HIT_DISPLAY_MS);
    },
    
    _handleEnemyPostHit(enemyElement) {
        const currentHp = Number(enemyElement.attr('hp'));
        
        if (currentHp <= 0) {
            EnemyManager.death(enemyElement);
        } else {
            setTimeout(() => {
                enemyElement.css('transition-timing-function', 'linear');
                EnemyManager.move(enemyElement, enemyElement.attr('hit-count'));
            }, 200);
        }
    },
    
    _isCollisionIgnored(enemyElement) {
        const state = GameState;
        const enemyLeft = i(enemyElement, 'left');
        const enemyWidth = i(enemyElement, 'width');
        const enemyHeight = i(enemyElement, 'height');
        const enemyType = enemyElement.attr('type');
        
        return (
            state.player.position + 10 < enemyLeft ||
            state.player.position - 10 > enemyLeft + enemyWidth ||
            state.hero.attr('in-damage') === 'true' ||
            i(state.hero, 'margin-bottom') > enemyHeight - 20 ||
            Number(state.enemies[enemyType].attack) === 0
        );
    },
    
    _calculateDamageTaken(enemyElement) {
        const state = GameState;
        const enemyType = enemyElement.attr('type');
        let damage = spread(state.enemies[enemyType].attack, Constants.DAMAGE_SPREAD);
        
        for (const slot in state.player.equipments) {
            const item = state.player.equipments[slot];
            if (item && state.equipments[item]) {
                damage -= state.equipments[item].defense || 0;
            }
        }
        
        return Math.max(1, damage);
    },
    
    _applyDamageToPlayer(damage) {
        const state = GameState;
        state.player.hp -= damage;
        
        $('body').append('<div class="hit self">' + prettyNumber(damage, 'red') + '</div>');
        state.hero.attr('in-damage', 'true');
        
        const knockbackDistance = Math.min(damage, Constants.HERO_KNOCKBACK_MAX);
        const knockback = setInterval(() => {
            state.player.position -= state.heroDirection * knockbackDistance;
        }, 10);
        
        setTimeout(() => clearInterval(knockback), 200);
        
        setTimeout(() => {
            state.hero.attr('in-damage', 'false');
            $('.hit.self').remove();
        }, Constants.DAMAGE_IMMUNITY_MS);
    }
};
