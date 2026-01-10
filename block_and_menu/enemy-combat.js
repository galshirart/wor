/**
 * Enemy Combat Module
 * 
 * Handles enemy attack logic: ranged attacks, melee attacks, projectiles.
 */

const EnemyCombat = {
    // ========== MAIN FUNCTIONS ==========

    /**
     * Check if an enemy can attack
     * @param {jQuery} enemyElement - The enemy DOM element
     * @returns {boolean}
     */
    canAttack(enemyElement) {
        const state = GameState;
        const $enemy = $(enemyElement);
        
        if (!$.contains(document, $enemy[0])) {
            return false;
        }

        // Check if enemy is active
        if ($enemy.attr('active') !== 'true') {
            return false;
        }
        
        // Check if enemy is angry
        if ($enemy.attr('angry') !== 'true') {
            return false;
        }

        // Check if enemy is on cooldown
        if ($enemy.attr('attack-cooldown') === 'true') {
            return false;
        }
        
        // Check if enemy has a ranged attack
        const enemyType = $enemy.attr('type');
        const enemyData = state.enemies[enemyType];
        
        if (!enemyData.rangedAttack) {
            return false;
        }
        
        // Check if player is in range
        const attackData = state.rangedAttacks[enemyData.rangedAttack];
        if (!attackData) {
            return false;
        }
        
        const enemyX = i($enemy, 'left') + i($enemy, 'width') / 2;
        const distanceToPlayer = Math.abs(state.player.position - enemyX);
        
        if (distanceToPlayer > attackData.flightRange || distanceToPlayer < Constants.ENEMY_PROJECTILE_MIN_DISTANCE) {
            return false;
        }
        
        return true;
    },

    /**
     * Execute an enemy attack
     * @param {jQuery} enemyElement - The enemy DOM element
     */
    attack(enemyElement) {
        const state = GameState;
        const $enemy = $(enemyElement);
        const enemyType = $enemy.attr('type');
        const enemyData = state.enemies[enemyType];
        
        if (!enemyData.rangedAttack) {
            return;
        }
        
        this._rangedAttack($enemy, enemyData);
    },

    /**
     * Update all enemy projectiles (called in game loop)
     */
    updateProjectiles() {
        const self = this;
        
        $('.enemy-projectile').each(function() {
            const $projectile = $(this);
            self._moveProjectile($projectile);
            self._checkProjectileCollision($projectile);
        });
    },

    // ========== PRIVATE HELPERS ==========

    /**
     * Execute a ranged attack
     * @param {jQuery} enemyElement - The enemy DOM element
     * @param {Object} enemyData - Enemy data from GameState
     */
    _rangedAttack(enemyElement, enemyData) {
        const state = GameState;
        const $enemy = $(enemyElement);
        const attackData = state.rangedAttacks[enemyData.rangedAttack];
        
        // Set cooldown (telegraph phase)
        $enemy.attr('attack-cooldown', 'true');

        $enemy.attr('state', 'shoot');
        $enemy.find('.image').css({
            'animation-duration': attackData.charge*2 + 'ms',
        });

        // Determine direction toward player
        const enemyX = i($enemy, 'left') + i($enemy, 'width') / 2;
        const direction = state.player.position > enemyX ? 1 : -1;
        
        // Spwan projectile after the charge time
        setTimeout(() => {
            // Check if enemy is still active, in DOM, and on current map before firing
            if ($enemy.attr('active') === 'true' && $.contains(document, $enemy[0])) {
                this._spawnEnemyProjectile($enemy, attackData, direction, enemyData.rangedAttack);
            }
        }, attackData.charge);

        setTimeout(() => {
            $enemy.attr('state', 'move').find('.image').css({
                'animation-duration': '500ms',
            });
            // Clear cooldown after another delay (total time = coolDown * 2)
            setTimeout(() => {
                if ($.contains(document, $enemy[0])) {
                    $enemy.attr('attack-cooldown', 'false');
                }
            }, attackData.coolDown);
        }, attackData.charge*2);
    },

    /**
     * Spawn an enemy projectile
     * @param {jQuery} enemyElement - The enemy DOM element
     * @param {Object} attackData - Attack data from rangedAttacks table
     * @param {number} direction - 1 for right, -1 for left
     */
    _spawnEnemyProjectile(enemyElement, attackData, direction, rangedAttack) {
        const state = GameState;
        const $enemy = $(enemyElement);
        const enemyX = i($enemy, 'left') + i($enemy, 'width') / 2;
        const enemyBottom = i($enemy, 'margin-bottom') + i($enemy, 'height') / 2;
        
        // For ballistic projectiles, target the player's current position
        const targetX = state.player.position;
        const distanceToTarget = Math.abs(targetX - enemyX);

        const img = new Image();
        img.src = 'assets/projectile-' + rangedAttack + '.webp';
        img.onload = function() {

            left = i($enemy, 'left') + (direction === 1 ? i($enemy, 'width') - img.width/2 : 0);
            let bottom = i(enemyElement, 'bottom')*1 + attackData['height']*1 + 'px';

            $('<div class="enemy-projectile"></div>')
            .appendTo('.field')
            .css({
                'left': left,
                'bottom': bottom,
                'transform': 'scaleX(' + direction + ')',
                'width': img.width/2,
                'height': img.height/2,
                'background-image': 'url(assets/projectile-' + rangedAttack + '.webp)',
                'background-size': 'contain'
            })
            .attr({
                'direction': direction,
                'damage': attackData.damage,
                'speed': attackData.flightSpeed,
                'range': attackData.flightRange,
                'origin-x': enemyX,
                'origin-y': enemyBottom,
                'target-x': targetX,
                'target-distance': distanceToTarget,
                'flight-path': attackData.flightPath || 'straight'
            });
            
            sound(attackData.sound);
        };
    },
    
    /**
     * Move a projectile based on its properties
     * @param {jQuery} projectile - The projectile element
    */
   _moveProjectile(projectile) {
        const $projectile = $(projectile);
        const direction = Number($projectile.attr('direction'));
        const speed = Number($projectile.attr('speed'));
        const range = Number($projectile.attr('range'));
        const originX = Number($projectile.attr('origin-x'));
        const originY = Number($projectile.attr('origin-y'));
        const targetDistance = Number($projectile.attr('target-distance'));
        const flightPath = $projectile.attr('flight-path') || 'straight';
        const currentX = i($projectile, 'left');
        
        // Move projectile horizontally
        const newX = currentX + direction * speed;
        $projectile.css('left', newX + 'px');
        
        // Calculate vertical position based on flight path
        if (flightPath === 'ballistic') {
            // Ballistic trajectory arcing toward player's position
            // Using parabolic motion that lands at the target distance
            const distanceTraveled = Math.abs(newX - originX);
            const normalizedX = distanceTraveled / targetDistance; // 0 to 1 (reaches 1 at player)
            // Parabolic arc: peaks at 0.5, returns to 0 at 1.0
            const arcHeight = targetDistance * 0.5; // Maximum height of the arc
            const verticalOffset = arcHeight * 4 * normalizedX * (1 - normalizedX);
            const newY = originY + verticalOffset;
            
            // Check if projectile hit the ground (floor)
            if (newY <= 0) {
                $projectile.remove();
                return;
            }
            
            $projectile.css('margin-bottom', newY + 'px');
        }
        
        // Check if exceeded range
        const distanceTraveled = Math.abs(newX - originX);
        if (distanceTraveled > range) {
            $projectile.remove();
        }
    },

    /**
     * Check if projectile collides with player
     * @param {jQuery} projectile - The projectile element
     */
    _checkProjectileCollision(projectile) {
        const state = GameState;
        const $projectile = $(projectile);
        const projectileX = i($projectile, 'left');
        const projectileWidth = i($projectile, 'width') || 20;
        
        // Check horizontal overlap with player
        const playerLeft = state.player.position - 20;
        const playerRight = state.player.position + 20;
        
        if (projectileX + projectileWidth < playerLeft || projectileX > playerRight) {
            return;
        }

        const projectileBottom = i($projectile, 'margin-bottom');
        const heroBottom = i(state.hero, 'margin-bottom');
        const projectileHeight = i($projectile, 'height');
        const flightPath = $projectile.attr('flight-path');
        if(flightPath === 'ballistic'){
            const projectileTop = projectileBottom + projectileHeight;
            const heroHeight = i(state.hero, 'height');
            const heroTop = heroBottom + heroHeight;
            if(projectileTop < heroBottom || projectileBottom > heroTop){
                return;
            }
        }
        else {
            if (heroBottom > projectileBottom + projectileHeight) {
                return;
            }
        }
        if (state.hero.attr('in-damage') === 'true') {
            return;
        }
        
        let damage = Number($projectile.attr('damage'));
        const projectileDirection = Number($projectile.attr('direction'));
        
        // Block only works if facing the projectile (opposite directions)
        // Projectile going right (1) is blocked by player facing left (-1), and vice versa
        const isFacingProjectile = state.blockDirection === -projectileDirection;
        
        if (state.isBlocking && isFacingProjectile) {
            damage = Math.round(damage * (1 - Constants.BLOCK_DAMAGE_REDUCTION));
            //damage = Math.max(1, damage);
            //sound('block-1'); // Block sound
            
            // Apply reduced damage with reduced knockback
            state.player.hp -= damage;
            $('body').append('<div class="hit self">' + prettyNumber(damage, 'red') + '</div>');
            state.hero.attr('in-damage', 'true');
            
            const knockback = setInterval(() => {
                state.player.position -= state.heroDirection * Constants.HERO_KNOCKBACK * Constants.BLOCK_KNOCKBACK_REDUCTION;
            }, 10);
            
            setTimeout(() => clearInterval(knockback), 200);
            setTimeout(() => {
                state.hero.attr('in-damage', 'false');
                $('.hit.self').remove();
            }, Constants.DAMAGE_IMMUNITY_MS);
        } else {
            console.log("block failed. isFacingProjectile = " + isFacingProjectile + "blocking = " + state.isBlocking );
            Combat._applyDamageToPlayer(damage);  
        }
        $projectile.remove();
        sound('hit-4');
    },

};