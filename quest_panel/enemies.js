/**
 * Enemy Manager Module
 * 
 * Handles enemy spawning, movement, and death.
 */

const EnemyManager = {
    /**
     * Spawn an enemy of given type
     * @param {string} type - Enemy type
     * @param {string} map - Map to spawn on
     */
    spawn(type, map) {
        const state = GameState;
        
        if (map !== state.player.location) {
            return;
        }
        
        const destination = random(Constants.ENEMY_SPAWN_MIN_X, i('.map', 'width') - Constants.ENEMY_SPAWN_MIN_X);
        const yOffset = random(-5, 5);
        const enemyData = state.enemies[type];
        
        const enemy = $('<div class="enemy" type="' + type + '"><div class="image"></div><div class="hpBar"><div class="bar"></div></div></div>')
            .appendTo('.field')
            .css({
                'left': destination,
                'margin-bottom': yOffset + 'px',
                'z-index': state.hero.css('z-index') - yOffset
            })
            .attr({
                'hp': enemyData.hp,
                'hit-count': 0,
                'hitable': enemyData.hitable
            });
        
        enemy.find('.image').css({
            'background-image': 'url(assets/enemy-' + type + '.webp)',
            'width': enemyData.size[0],
            'height': enemyData.size[1]
        });
        
        enemy.fadeIn(1000).promise().done(function() {
            $(this).attr('active', 'true');
        });
        
        this.move(enemy, 0);
    },
    
    /**
     * Move an enemy
     * @param {jQuery} enemy - Enemy element
     * @param {number} hitCount - Current hit count (for interruption detection)
     */
    move(enemy, hitCount) {
        const state = GameState;
        const $enemy = $(enemy);
        
        if ($enemy.attr('active') === 'false' || hitCount < Number($enemy.attr('hit-count'))) {
            return;
        }
        
        const enemyType = $enemy.attr('type');
        const enemyData = state.enemies[enemyType];
        
        // Static enemies
        if (Number(enemyData.speed) === 0) {
            $enemy.attr('state', 'move').find('.image').css('animation-duration', '500ms');
            
            if (enemyType === 'burning-plank') {
                $enemy.css('left', '1300px');
            }
            return;
        }
        
        const minX = Constants.ENEMY_MIN_X;
        const maxX = i('.map', 'width') - Constants.ENEMY_MIN_X;
        const currentX = i($enemy, 'left');
        
        let speed = spread(enemyData.speed, Constants.ENEMY_SPEED_VARIANCE);
        let distance, standTime;
        
        if ($enemy.attr('angry') === 'true') {
            // Chase player
            const desired = state.player.position - currentX - i($enemy, 'width') / 2 + random(-100, 100);
            const destX = Math.max(minX, Math.min(maxX, currentX + desired));
            distance = destX - currentX;
            speed = speed / 1.2;
            standTime = 0;
        } else {
            // Wander randomly
            distance = Math.max(
                minX - currentX,
                Math.min(maxX - currentX, random(0-Constants.ENEMY_WANDER_RANGE, Constants.ENEMY_WANDER_RANGE))
            );
            standTime = random(Constants.ENEMY_STAND_MIN_MS, Constants.ENEMY_STAND_MAX_MS);
            
            setTimeout(() => {
                if ($enemy.attr('angry') === 'true') return;
                $enemy.attr('state', 'stand');
            }, Math.abs(distance) * speed);
        }
        
        if (distance === 0) distance = 1;
        
        $enemy.attr('state', 'move')
            .css({
                'left': i($enemy, 'left') + distance,
                'transform': 'scaleX(' + sign(distance) + ')',
                'transition-duration': abs(distance) * speed + 'ms'
            });
        
        $enemy.find('.hpBar').css('transform', 'scaleX(' + sign(distance) + ')');
        
        setTimeout(() => {
            this.move($enemy, hitCount);
        }, abs(distance) * speed + standTime);
    },
    
    /**
     * Handle enemy death
     * @param {jQuery} enemy - Enemy element
     */
    death(enemy) {
        const state = GameState;
        const $enemy = $(enemy);
        const enemyType = $enemy.attr('type');
        const enemyData = state.enemies[enemyType];
        
        // Drop item
        if (enemyData.item) {
            let itemType = enemyData.item;
            let amount = 1;
            
            if (enemyData.gold === 'TRUE' && random(1, 2) === 1) {
                itemType = 'gold';
                amount = Math.max(1, Math.round(average([enemyData.hp, enemyData.attack]) / 30));
            }
            
            $('<div class="item"></div>')
                .appendTo('.field')
                .css({
                    'left': number($enemy.css('left')),
                    'background-image': 'url(assets/item-' + itemType + '.webp)',
                    'margin-bottom': i($enemy, 'margin-bottom') + 'px',
                    'z-index': i($enemy, 'z-index')
                })
                .attr({
                    'type': itemType,
                    'amount': amount
                });
        }
        
        // Death animation
        $enemy
            .css('left', i($enemy, 'left'))
            .addClass('dead')
            .attr('active', 'false')
            .fadeOut(1000)
            .promise()
            .done(function() {
                $(this).remove();
            });
        
        // Respawn after delay
        const respawnDelay = random(Constants.ENEMY_RESPAWN_MIN_MS, Constants.ENEMY_RESPAWN_MAX_MS);
        const deathMap = state.player.location;
        setTimeout(() => {
            this.spawn(enemyType, deathMap);
        }, respawnDelay);
        
        // Track kill
        state.player.enemiesSlained[enemyType] = (state.player.enemiesSlained[enemyType] || 0) + 1;
        
        sound(enemyData.sound);
        UI.log('Slained ' + enemyType, 'slain');
    }
};

// Legacy aliases
const enemySpawn = (type, map) => EnemyManager.spawn(type, map);
const enemyMove = (enemy, hitCount) => EnemyManager.move(enemy, hitCount);
const enemyDeath = (enemy) => EnemyManager.death(enemy);
