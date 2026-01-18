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
     * @param {number} attackType - Animation type (1-6)
     * @param {number} rangeStart - Attack range start offset
     * @param {number} rangeEnd - Attack range end offset  
     * @param {number} attackMultiplier - Damage multiplier
     * @param {number} maxTargets - Max enemies to hit
     */
    fight(attackType = random(1, 5), rangeStart = 0, rangeEnd = 0, attackMultiplier = 1, maxTargets = 1) {
        const state = GameState;
        const hero = state.hero;
        
        if (Player.getMode() === 'fight' || Player.getMode() === 'jump' || this.attackCooldown) {
            return;
        }
        
        this.attackCooldown = true;
        Player.setMode('fight');
        
        const weapon = state.equipments[state.player.equipments.weapon];
        
        if (weapon.type === 'melee') {
            this._executeMeleeAttack(rangeStart, rangeEnd, attackMultiplier);
        } else if (weapon.type === 'range') {
            this._executeRangedAttack(attackMultiplier, maxTargets);
            attackType = 6;
        }
        
        this._playAttackAnimation(attackType);
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
        const mpCost = (state.player.attack * skill.attackMultiplier) / 2;
        
        if (state.player.mp < mpCost) {
            UI.shake($('.bar.mp').parent('.bar-container'));
            return;
        }
        
        state.player.mp -= mpCost;
        this.skillCooldown = true;
        
        this._executeSkill(skillName, skill);
    },
    
    /**
     * Apply a hit to an enemy
     * @param {jQuery} enemyElement - The enemy DOM element
     * @param {number} baseAttack - Base attack damage
     */
    hit(enemyElement, baseAttack) {
        const { finalDamage, isCritical } = this._calculateDamage(baseAttack);
        
        this._applyHitToEnemy(enemyElement, finalDamage,);
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
    
    _executeMeleeAttack(rangeStart, rangeEnd, attackMultiplier) {
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
        
        setTimeout(() => sound('attack'), state.player.attackSpeed / 4);
        
        setTimeout(() => {
            this._hitEnemiesInRange(x1, x2, attackMultiplier);
        }, state.player.attackSpeed / 2);
    },
    
    _executeRangedAttack(attackMultiplier, maxTargets) {
        const state = GameState;
        
        setTimeout(() => sound('bow'), state.player.attackSpeed / 4);
        
        setTimeout(() => {
            this._spawnProjectile(attackMultiplier, maxTargets);
        }, state.player.attackSpeed / 2);
    },
    
    _hitEnemiesInRange(x1, x2, attackMultiplier) {
        const state = GameState;
        const self = this;
        
        $('.enemy[active=true][hitable=TRUE]').each(function() {
            const enemyElement = $(this);
            const enemyLeft = i(enemyElement, 'left');
            const enemyRight = enemyLeft + i(enemyElement, 'width');
            
            if (x1 > enemyRight || x2 < enemyLeft) {
                return;
            }
            
            self.hit(enemyElement, state.player.attack * attackMultiplier);
            return false;
        });
    },
    
    _spawnProjectile(attackMultiplier, maxTargets) {
        const state = GameState;
        
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
                'attack': state.player.attack * attackMultiplier,
                'maxTargets': maxTargets
            });
    },
    
    _playAttackAnimation(attackType) {
        const state = GameState;
        
        state.hero.attr('attackType', attackType);
        $('.weapon').css('animation-name', 'weapon-' + attackType);
        
        setTimeout(() => {
            Player.setMode('rest');
            $('.weapon').css('animation-name', '');
            this.attackCooldown = false;
        }, state.player.attackSpeed);
    },
    
    _getSkillFromKey(key) {
        const skillMap = { 's': 'surge', 'd': 'impact' };
        return skillMap[key] || null;
    },
    
    _executeSkill(skillName, skill) {
        const state = GameState;
        const weapon = state.equipments[state.player.equipments.weapon];

        const skillSprite = $('<div class="skill"></div>').css({
            'transform': 'scaleX(' + state.heroDirection + ')',
            'background-image': 'url(assets/skill-' + skillName + '.webp)'
        });
        
        if (skillName === 'surge' && weapon.type === 'melee') {
            state.player.position += state.heroDirection * 100;
            this.fight(1, 0, 120, skill.attackMultiplier, 2);
            sound('swoosh');
            state.hero.after(skillSprite);
        }
        
        if (skillName === 'impact' && weapon.type === 'melee') {
            this.fight(6, -100, 80, skill.attackMultiplier, 6);
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
        const isCritical = random(1, 100) <= state.player.critical;
        
        
        if (isCritical) {
            finalDamage = Math.round(finalDamage * state.player.criticalMultiplier);
        }
        
        return { finalDamage, isCritical };
    },
    
    _applyHitToEnemy(enemyElement, damage) {
        const state = GameState;
        const currentHp = Number(enemyElement.attr('hp'));
        const hitCount = Number(enemyElement.attr('hit-count'));
        const enemyType = enemyElement.attr('type');

        enemyKnockback = 0;
        if (damage > state.enemies[enemyType].hp/10) {
            enemyKnockback = 10
        }
        enemyKnockback = 0;
        if (damage > state.enemies[enemyType].hp/20) {
            enemyKnockback = 5
        }
        
        enemyElement.attr({
            'state': 'enemy-hit',
            'angry': 'true',
            'hp': currentHp - damage,
            'hit-count': hitCount + 1
        }).css({
            'transition-duration': '50ms',
            'transition-timing-function': 'ease-out',
            'left': i(enemyElement, 'left') + state.heroDirection * enemyKnockback + 'px'
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
        damage -= state.player.defense || 0;
        return Math.max(1, damage);
    },
    
    _applyDamageToPlayer(damage) {
        const state = GameState;
        state.player.hp -= damage;
        
        $('body').append('<div class="hit self">' + prettyNumber(damage, 'red') + '</div>');
        state.hero.attr('in-damage', 'true');
        
        knockback = setInterval(() => {
            state.player.position -= state.heroDirection * Constants.HERO_KNOCKBACK;
        }, 10);
        
        setTimeout(() => clearInterval(knockback), 200);
        
        setTimeout(() => {
            state.hero.attr('in-damage', 'false');
            $('.hit.self').remove();
        }, Constants.DAMAGE_IMMUNITY_MS);
    }
};
