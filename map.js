/**
 * Map Manager Module
 * 
 * Handles map loading, transitions, walking, and interactions.
 */

const MapManager = {
    /**
     * Enter a new map
     * @param {string} originMap - Map we're coming from (for positioning)
     */
    enter(originMap) {
        const state = GameState;
        
        $('.overlay').css('opacity', 1);
        
        const imagesToLoad = this._getImagesToPreload();
        
        setTimeout(() => {
            this._setupMapLayers();
        }, 100);
        
        Promise.all(imagesToLoad.map(src => this._preloadImage(src)))
            .then(() => {
                setTimeout(() => {
                    if (originMap) {
                        this._setPlayerPositionFromPort(originMap);
                    }
                    
                    state.mapWidth = i('.map', 'width');
                    state.backWidth = i('.back', 'width');
                    state.frontWidth = i('.front', 'width');
                    
                    this.walk(state.keyState);
                    this._spawnMapEntities();
                    this.placePorts();
                    
                    if (!state.player.mapsVisited.includes(state.player.location)) {
                        state.player.mapsVisited.push(state.player.location);
                    }

                    if (state.maps[state.player.location].isReviveMap === "TRUE") {
                        state.player.reviveMap = state.player.location;
                    }
                    
                    this._setupTutorial();
                }, 150);
                
                setTimeout(() => {
                    this._startGameLoop();
                    this._showMapSign();
                }, 250);
            });

        if (player.backpack.hasOwnProperty(GameState.maps[player.location].continent+'-map')) {
           $('.button.continent-map').show()
        } else {
            $('.button.continent-map').hide();
        }
    },
    
    /**
     * Handle walking based on key state
     * @param {Object} keyState - Current key states
     */
    walk(keyState) {
        const state = GameState;
        
        if (Player.getMode() === 'fight' || Player.getMode() === 'block' || Combat.skillCooldown) {
            return;
        }
        
        let change = 0;
        if (keyState.right) change = state.player.walkSpeed;
        else if (keyState.left) change = -state.player.walkSpeed;

        if (change) {
            state.heroDirection = Math.sign(change);
            state.hero
                .css('transform', 'scaleX(' + state.heroDirection + ')')
                .attr('direction', state.heroDirection);
            
            if (Player.getMode() !== 'jump') {
                Player.setMode('walk');
            }
            
            state.player.position += change;
            Input.hideCursor();
        } else if (Player.getMode() !== 'jump') {
            Player.setMode('rest');
        }
        
        // Clamp position to map bounds
        if (state.player.position < Constants.MAP_EDGE_BUFFER) {
            state.player.position = Constants.MAP_EDGE_BUFFER;
        }
        if (state.player.position > state.mapWidth - Constants.MAP_EDGE_BUFFER) {
            state.player.position = state.mapWidth - Constants.MAP_EDGE_BUFFER;
        }
        
        this._updateNPCProximity();
    },
    
    /**
     * Slide map to follow player
     * Now delegates to Camera module for proper edge-aware scrolling
     */
    slideMap() {
        Camera.follow();
    },
    
    /**
     * Place portal elements on the map
     */
    placePorts() {
        const state = GameState;
        const currentMap = state.maps[state.player.location];
        
        $('.port, .lock-icon, .sparkles').remove();
        
        Object.keys(currentMap.ports || {}).forEach(port => {
            const portX = Constants.PORT_X_OFFSET + 
                (i('.map', 'width') - Constants.MAP_EDGE_CALCULATION) * currentMap.ports[port] / 100;
            
            const portElement = $('<div class="port"></div>')
                .css('left', portX)
                .attr('target', port)
                .appendTo('.field');
            
            // Check lock conditions
            const targetMapConditions = state.maps[port].conditions || {};
            
            for (const condition in targetMapConditions) {
                const value = targetMapConditions[condition];
                
                if (condition === 'questAccepted' && !state.player.questsAccepted.includes(value)) {
                    portElement.addClass('locked');
                    $('<img src="assets/item-lock.webp" class="lock-icon" />')
                        .css('left', portX)
                        .appendTo('.field');
                }
                
                if (condition === 'questCompleted' && !state.player.questsCompleted.includes(value)) {
                    portElement.addClass('locked');
                    $('<img src="assets/item-lock.webp" class="lock-icon" />')
                        .css('left', portX)
                        .appendTo('.field');
                }

                if (condition === 'mapVisited' && !state.player.mapsVisited.includes(value)) {
                    portElement.addClass('locked');
                    $('<img src="assets/item-lock.webp" class="lock-icon" />')
                        .css('left', portX)
                        .appendTo('.field');
                }
            }
            
            $('<div class="sparkles"></div>')
                .css('left', portX)
                .appendTo('.field');
        });
        
        setTimeout(() => {
            $('.port:not(.locked)').addClass('active');
        }, 400);
    },
    
    /**
     * Place an NPC on the map
     * @param {string} npc - NPC identifier
     */
    placeNPC(npc) {
        const state = GameState;
        const npcData = state.npcs[npc];
        const currentMap = state.maps[state.player.location];
        const npcPosition = currentMap.npc[npc];
        
        const npcElement = $('<div class="npc"><div class="image"></div></div>')
            .appendTo('.field')
            .css({
                'left': (i('.map', 'width') - 1200) * npcPosition[0] / 100 + 600 - npcData.size[0] / 2,
                'margin-bottom': npcPosition[1] + 'px'
            })
            .attr({
                'quest': npcData.quest,
                'npc-name': npc
            })
            .append('<div class="chat-bubble dots"></div>');
        
        npcElement.find('.image').css({
            'background-image': 'url(assets/npc-' + npcData.name + '.webp)',
            'background-size': npcData.size[0] * 5 + 'px',
            'width': npcData.size[0],
            'height': npcData.size[1]
        });
    },
    
    /**
     * Handle player interaction (space bar)
     */
    interact() {
        if (Player.getMode() === 'fight' || Player.getMode() === 'jump' || Combat.attackCooldown) {
            return;
        }
        
        const state = GameState;
        
        // Check for port interaction
        $('.port.active').not('.locked').each(function() {
            const port = $(this);
            if (state.player.position < i(port, 'left') ||
                state.player.position > i(port, 'left') + i(port, 'width')) {
                return;
            }
            
            port.removeClass('active');
            const originMap = state.player.location;
            state.player.location = port.attr('target');
            
            clearInterval(state.gameBeat);
            MapManager.enter(originMap);
            UI.closeCard();
            sound('port');
        });
        
        // Check for NPC interaction
        if (!$('.card.left.npc').is(':visible') && $('.npc.near-player').length > 0) {
            $('.npc.near-player').find('.chat-bubble').addClass('hide');
            NPCManager.interact($('.npc.near-player').attr('npc-name'));
            sound('click');
        }
        
        // Close dialog if open with single action
        if ($('.card.left.npc').is(':visible') && $('.card.left.npc .actions').length === 1) {
            UI.closeCard();
        }

        
        Player.setMode('rest');
    },
    
    /**
     * Teleport to a location (for debugging)
     * @param {string} location - Map identifier
     */
    teleport(location) {
        const state = GameState;
        state.player.location = location;
        state.player.position = Constants.PLAYER_POSITION_X;
        clearInterval(state.gameBeat);
        this.enter();
    },
    
    // ========== PRIVATE HELPERS ==========
    
    _getImagesToPreload() {
        const state = GameState;
        const currentMap = state.maps[state.player.location];
        const images = [];
        
        images.push(`assets/map-${state.player.location}.webp`);
        
        if (currentMap.layers.includes('front')) {
            images.push(`assets/map-${state.player.location}-front.webp`);
        }
        if (currentMap.layers.includes('back')) {
            images.push(`assets/map-${state.player.location}-back.webp`);
        }
        
        Object.keys(currentMap.enemies || {}).forEach(type => {
            images.push(`assets/enemy-${type}.webp`);
            if (state.enemies[type].item) {
                images.push(`assets/item-${state.enemies[type].item}.webp`);
            }
			if (state.enemies[type].rangedAttack) {
                images.push(`assets/projectile-${state.enemies[type].rangedAttack}.webp`);
            }
        });
        
        Object.keys(currentMap.npc || {}).forEach(npc => {
            images.push(`assets/npc-${state.npcs[npc].name}.webp`);
            images.push(`assets/avatar-${state.npcs[npc].name}.webp`);
        });
        
        return images;
    },
    
    _preloadImage(src) {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        });
    },
    
    _setupMapLayers() {
        const state = GameState;
        const currentMap = state.maps[state.player.location];
        
        $('.back, .front').remove();
        $('.enemy').remove();
        $('.field').html(`<img class="map" src="assets/map-${state.player.location}.webp" />`);
        
        (currentMap.layers || []).forEach(layer => {
            $('.field').after(`<img class="${layer}" src="assets/map-${state.player.location}-${layer}.webp" />`);
        });
    },
    
    _setPlayerPositionFromPort(originMap) {
        const state = GameState;
        const currentMap = state.maps[state.player.location];
        const portPercent = currentMap.ports[originMap] || 0;
        
        state.player.position = 634 + (i('.map', 'width') - Constants.MAP_EDGE_CALCULATION) * portPercent / 100;
    },
    
    _spawnMapEntities() {
        const state = GameState;
        const currentMap = state.maps[state.player.location];
        
        Object.keys(currentMap.enemies || {}).forEach(type => {
            const count = currentMap.enemies[type];
            if (count && count > 0)
            {
                for (let i = 0; i < count; i++) {
                    EnemyManager.spawn(type, state.player.location);
                }
            }
        });        
        Object.keys(currentMap.npc || {}).forEach(npc => {
            this.placeNPC(npc);
        });
    },
    
    _setupTutorial() {
        const state = GameState;
        
        const tutorialMaps = ['a-box', 'box-shore', 'laozi\'s-dojo', 'sunny-beach', 'coconut-village'];
        if (state.tutorialInterval) {
            clearInterval(state.tutorialInterval);
            state.tutorialInterval = null;
        }
        if (tutorialMaps.includes(state.player.location)) {
            state.tutorialInterval = setInterval(() => {
                $('.tutorial').removeClass('show');
                
                // A-BOX: Movement and travel
                if (state.player.location === 'a-box') {
                    if (state.player.position < 1000) {
                        $('[tutorial=move]').addClass('show');
                    }
                    if (state.player.position > 1300) {
                        $('[tutorial=travel]').addClass('show');
                    }
                }
                // BOX-SHORE: Jump and interact
                if (state.player.location === 'box-shore') {
                    if (state.player.position > 1100 && state.player.position < 1400) {
                        $('[tutorial=jump]').addClass('show');
                    }
                    if (state.player.position > 1900 && state.player.position < 2090) {
                        $('[tutorial=interact]').addClass('show');
                    }
                }
                // LAOZI'S DOJO: Attack (show after accepting Laozi's quest)
                if (state.player.location === 'laozi\'s-dojo') {
                    if (player.questsAccepted.includes('q11112')) {
                        $('[tutorial=attack]').addClass('show');
                    }
                }
                // SUNNY-BEACH: Pickup (show only if no gold obtained yet, and items are available to pick)
                if (state.player.location === 'sunny-beach') {
                    if (player.backpack.gold < 1 && $('.field .item').length > 0) {
                        $('[tutorial=pickup]').addClass('show');
                    }
                }
                if ($('.card.left.npc').is(':visible')) {
                    $('[tutorial=interact]').remove();
                }
            }, 200);
        } else {
            $('.tutorial').remove();
        }
    },
    
    _startGameLoop() {
        const state = GameState;
        
        state.gameBeat = setInterval(() => {
            // Skip game loop if paused
            if (state.paused || state.heroIsDead) {
                return;
            }
                this.slideMap();
                this.walk(state.keyState);
                Combat.checkCollisions();
                Player.updateProjectiles();
                EnemyCombat.updateProjectiles();
                Player.recover();
                PenaltyManager.updateTimers(10);    
                GameState.save();
        }, 10);
    },
    
    _showMapSign(text) {
        const state = GameState;

        if (!text) {
            text = spcDash(state.player.location);
        }
        
        $('.overlay').css('opacity', 0);
        $('.mapsign').remove();
        $('.window').append(`<div class="mapsign"><span></span><span>${text}</span><span></span></div>`);
        UI.updateMetaTitle();
    },
    
    _updateNPCProximity() {
        const state = GameState;
        
        $('.field .npc').each(function() {
            const npc = $(this);
            const near = state.player.position >= i(npc, 'left') - Constants.NPC_INTERACTION_RANGE &&
                         state.player.position <= i(npc, 'left') + i(npc, 'width') + Constants.NPC_INTERACTION_RANGE;
            npc.toggleClass('near-player', near);
        });
        
        if ($('.field .npc.near-player').length === 0) {
            UI.closeCard('npc');
        }
    }
};

// Legacy aliases
const enterMap = (originMap) => MapManager.enter(originMap);
const walk = (keyState) => MapManager.walk(keyState);
const slideMap = () => MapManager.slideMap();
const placePorts = () => MapManager.placePorts();
const placeNPC = (npc) => MapManager.placeNPC(npc);
const interact = () => MapManager.interact();
const teleport = (location) => MapManager.teleport(location);
