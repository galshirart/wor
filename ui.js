/**
 * UI Module
 * 
 * Handles all user interface: cards, backpack, tooltips, logging, effects.
 */

const UI = {
    /**
     * Update browser tab title
     */
    updateMetaTitle() {
        const location = GameState.player.location
            .replace(/-/g, ' ')
            .replace(/\b(\w)(\w*'?[a-z]*)/g, (_, first, rest) => {
                if (/'[a-z]+$/.test(rest)) {
                    const parts = rest.split("'");
                    const afterApos = parts[1];
                    if (afterApos && afterApos.toLowerCase() === 's') {
                        return first.toUpperCase() + parts[0].toLowerCase() + "'" + afterApos.toLowerCase();
                    } else if (afterApos) {
                        return first.toUpperCase() + parts[0].toLowerCase() + "'" + afterApos.charAt(0).toUpperCase() + afterApos.slice(1).toLowerCase();
                    }
                }
                return first.toUpperCase() + (rest ? rest.toLowerCase() : '');
            });
        
        document.querySelector('title').textContent = "Duck Delivery | " + location;
    },
    
    /**
     * Typewriter text effect
     * @param {jQuery} element - Element to type into
     * @param {string} text - Text to type
     * @param {number} index - Current character index
     * @param {Function} callback - Called when complete
     */
    typeWriterEffect(element, text, index, callback) {
        if (index < text.length) {
            element.html(element.html() + text.charAt(index));
            setTimeout(() => {
                this.typeWriterEffect(element, text, index + 1, callback);
            }, Constants.DIALOG_CHAR_DELAY_MS);
        } else if (callback) {
            callback();
        }
    },
    
    /**
     * Zoom camera in or out
     * @param {string} direction - 'in' or 'out'
     */
    zoom(direction) {
        const state = GameState;
        const percentage = (600 - state.player.position) / (i('.map', 'width') - 1200);
        
        $('.front').css('transform-origin', Math.abs(percentage) * 100 + '% 482px');
        
        if (direction === 'in') {
            $('body').addClass('zoom');
        } else {
            $('body').removeClass('zoom');
        }
    },
    
    /**
     * Open buy menu for an item
     * @param {string} item - Item to buy
     */
    openBuyMenu(item) {
        const state = GameState;
        
        $('.card.middle').remove();
        
        const card = $('<div class="card middle buy"></div>')
            .appendTo('.window')
            .append(this.createItemRow(item).css('font-size', '16px'))
            .append(this._getItemStats(item));
        
        card.append('<div class="flex stat price"><label>PRICE</label><div class="list"></div></div>');
        
        const actions = $('<div class="actions"><div class="button yellow">buy</div></div>');
        actions.find('.button').attr('onclick', `UI.buy("${item}"); $(".card.middle").remove()`);
        
        const itemData = state.equipments[item];
        
        for (const requiredItem in itemData.price) {
            const amountRequired = itemData.price[requiredItem];
            const amountAvailable = state.player.backpack[requiredItem] || 0;
            
            const itemRow = this.createItemRow(requiredItem, amountRequired)
                .appendTo(card.find('.price .list'));
            
            if (amountAvailable < amountRequired) {
                itemRow.css('opacity', '0.4');
                actions.find('.button').addClass('disabled').attr('onclick', '');
            }
        }
        
        card.append(actions);
    },
    
    /**
     * Complete a purchase
     * @param {string} item - Item to buy
     */
    buy(item) {
        const state = GameState;
        const itemData = state.equipments[item];
        
        for (const requiredItem in itemData.price) {
            const amountRequired = itemData.price[requiredItem];
            state.player.backpack[requiredItem] -= amountRequired;
            this.log('Paid ' + amountRequired + ' ' + requiredItem, requiredItem);
        }
        
        Player.acquire(item);
        this.pop($('.card.backpack').find('[type=' + item + ']'));
        sound('heavy-item');
        this.log('Bought ' + item, item);
    },
    
    /**
     * Create an item row element
     * @param {string} item - Item type
     * @param {number} amount - Optional amount
     * @returns {jQuery}
     */
    createItemRow(item, amount) {
        const state = GameState;
        const itemRow = $('<div class="item-row flex"></div>');
        
        $('<div class="thumb"></div>')
            .css('background-image', 'url(assets/item-' + item + '.webp)')
            .appendTo(itemRow);
        
        const isEquipment = state.equipments && state.equipments.hasOwnProperty(item);
        const labelText = (amount !== undefined && !isEquipment) 
            ? amount + ' ' + spcDash(item) 
            : spcDash(item);
        
        itemRow.append('<label>' + labelText + '</label>');
        
        return itemRow;
    },
    
    /**
     * Update backpack display
     */
    setBackpack() {
        const state = GameState;
        
        $('.bar.gold .value').html(state.player.backpack.gold.toLocaleString());
        
        if (state.player.backpack.gold === 0) {
            $('.bar.gold').hide();
        } else {
            $('.bar.gold').show();
        }
        
        $('.backpack .thumb').remove();
        
        for (const item in state.player.backpack) {
            if (state.player.backpack[item] >= 1 && item !== 'gold') {
                const thumb = $('<div class="thumb tooltip"></div>')
                    .appendTo('.backpack .grid')
                    .attr('type', item)
                    .attr('ondblclick', 'Player.equip("' + item + '")')
                    .attr('onclick', 'NPCManager.sell("' + item + '")')
                    .css('background-image', 'url(assets/item-' + item + '.webp)');
                
                if (state.player.backpack[item] > 1) {
                    thumb.html('<span class="amount">' + state.player.backpack[item] + '</span>');
                }
            } else if (item !== 'gold') {
                delete state.player.backpack[item];
            }
        }
        
        // Mark equipped items
        for (const slot in state.player.equipments) {
            if (state.player.equipments[slot]) {
                $('.backpack').find('[type=' + state.player.equipments[slot] + ']').addClass('equiped');
            }
        }
        
        // Make backpack sortable
        $('.backpack .grid').sortable({
            stop: () => this._handleBackpackSort()
        });
        
        this.setTooltips();
    },
    
    /**
     * Update consumables bar
     */
    setConsumables() {
        const state = GameState;
        
        $('.consumables').html('');
        
        for (const item in state.player.backpack) {
            if (state.consumables && state.consumables.hasOwnProperty(item)) {
                $('<div class="icon" type="' + item + '"></div>')
                    .appendTo('.consumables')
                    .css('background-image', 'url(assets/item-' + item + '.webp)');
            }
        }
        
        state.activeConsumables.forEach(item => {
            if ($('.consumables [type="' + item + '"]').length === 0) {
                $('<div class="icon" type="' + item + '"></div>')
                    .appendTo('.consumables')
                    .css('background-image', 'url(assets/item-' + item + '.webp)');
            }
            
            $('.consumables [type="' + item + '"]').addClass('active');
        });
    },
    
    /**
     * Set up item tooltips
     */
    setTooltips() {
        const state = GameState;
        
        $('.card.hover').remove();
        
        $('.tooltip').hover(function() {
            const itemType = $(this).attr('type');
            
            const card = $('<div class="card hover middle bottom"></div>')
                .appendTo('.window')
                .append(UI.createItemRow(itemType));
            
            if (state.equipments && state.equipments.hasOwnProperty(itemType)) {
                card.append('<div><div class="tip">DOUBLE CLICK TO EQUIP</div></div>')
                    .append(UI._getItemStats(itemType));
            }
            
            if (state.consumables && state.consumables.hasOwnProperty(itemType)) {
                const consumableIndex = $('.consumables .icon[type=' + itemType + ']').index() + 1;
                const consumable = state.consumables[itemType];
                
                card.append('<div><div class="tip">PRESS ' + consumableIndex + ' TO CONSUME</div></div>');
                card.append('<div class="flex columns"><label>' + consumable.effect + '</label><label>+' + consumable.value + '</label></div>');
                
                if (consumable.duration > 0) {
                    card.append('<div class="flex columns"><label>DURATION</label><label>' + consumable.duration + ' minutes</label></div>');
                }
            }
        }, function() {
            $('.card.hover').remove();
        });
    },
    
    /**
     * Close a card
     * @param {string} element - Optional specific element to close
     */
    closeCard(element) {
        this.zoom('out');
        clearInterval(GameState.dialogInterval);
        
        if (element === 'npc') {
            $('.card.left').remove();
            $('.chat-bubble').removeClass('hide');
        } else {
            $('.card.left').remove();
            $('.card.middle').remove();
            $('.card.backpack').hide();
            $('.card.quests').hide();
        }
    },

    /**
     * Toggle quests card visibility
     */
    toggleQuestsCard() {
        const card = $('.card.quests');
        if (card.is(':visible')) {
            card.hide();
        } else {
            this.openQuestsCard();
        }
    },

    /**
     * Open quests card and populate it
     */
    openQuestsCard() {
        const card = $('.card.quests');
        card.show();
        this.renderQuestList();
    },

    /**
     * Render the quest list in the left pane
     */
    renderQuestList() {
        const state = GameState;
        const listEl = $('.card.quests .quest-list');
        listEl.empty();

        // Get active quests (accepted but not completed)
        const activeQuests = state.player.questsAccepted.filter(
            q => !state.player.questsCompleted.includes(q)
        );

        // Render active quests
        this._renderQuests(listEl, activeQuests, false);

        // Add separator if we have both active and completed
        if (activeQuests.length > 0 && state.player.questsCompleted.length > 0) {
            listEl.append('<div class="separator"></div>');
        }

        // Render completed quests
        this._renderQuests(listEl, state.player.questsCompleted, true);

        // Show empty state if no quests
        if (activeQuests.length === 0 && state.player.questsCompleted.length === 0) {
            listEl.append('<div class="quest-item" style="opacity:0.5">NO QUESTS</div>');
        }

        // Reset details pane
        $('.card.quests .quest-details').html('<div class="empty-state">SELECT A QUEST</div>');
    },

    /**
     * Render the quests
     * @param {jQuery} listEl - The list element to append to
     * @param {Array} questIds - Array of quest IDs to render
     * @param {boolean} isCompleted - Whether these are completed quests
     */
    _renderQuests(listEl, questIds, isCompleted) {
        const state = GameState;
        const standaloneQuests = [];
        
        questIds.forEach(questId => {
            const quest = state.quests[questId];
            if (!quest) return;
            const title = quest["Quest Title"];
            standaloneQuests.push({ questId, quest, title });

        });
        
        // Render standalone quests first
        standaloneQuests.forEach(({ questId, quest, title }) => {
            const item = $('<div class="quest-item"></div>')
                .addClass(isCompleted ? 'completed' : '')
                .attr('data-quest-id', questId)
                .text(title || spcDash(questId))
                .on('click', () => {
                    document.activeElement?.blur();
                    this.showQuestDetails(questId);
                });
            listEl.append(item);
        });
    },

    /**
     * Show quest details in the right pane
     * @param {string} questId - Quest identifier
     */
    showQuestDetails(questId) {
        const state = GameState;
        const quest = state.quests[questId];
        if (!quest) return;

        const status = QuestManager.getStatus(questId);
        const detailsEl = $('.card.quests .quest-details');
        
        // Update selected state in list
        $('.card.quests .quest-list .quest-item').removeClass('selected');
        $(`.card.quests .quest-list .quest-item[data-quest-id="${questId}"]`).addClass('selected');

        // Build details HTML
        let html = '';
        const title = quest["Quest Title"];
        // Title
        html += `<h3>${title || spcDash(questId)}</h3>`;

        // Description
        const description = quest.description;
        if (description) {
            html += `<div class="description">${description}</div>`;
        }

        // Objectives
        html += '<div class="section-label">OBJECTIVES</div>';
        const progress = QuestManager.getObjectiveProgress(questId);
        
        if (progress) {
            if (progress.type === 'kill') {
                progress.enemies.forEach(enemy => {
                    const completed = enemy.killed >= enemy.total;
                    const checkClass = completed ? 'checkbox completed' : 'checkbox';
                    html += `<div class="objective">
                        <div class="${checkClass}"></div>
                        <span>Kill ${spcDash(enemy.name)}</span>
                        <span class="progress">${enemy.killed}/${enemy.total}</span>
                    </div>`;
                });
            } else if (progress.type === 'visit') {
                const completed = progress.visited;
                const checkClass = completed ? 'checkbox completed' : 'checkbox';
                html += `<div class="objective">
                    <div class="${checkClass}"></div>
                    <span>Visit ${spcDash(progress.location)}</span>
                </div>`;
            } else if (progress.type === 'collect') {
                progress.items.forEach(item => {
                    const completed = item.collected >= item.total;
                    const checkClass = completed ? 'checkbox completed' : 'checkbox';
                    html += `<div class="objective">
                        <div class="${checkClass}"></div>
                        <span>Collect ${spcDash(item.name)}</span>
                        <span class="progress">${item.collected}/${item.total}</span>
                    </div>`;
                });
            }
        }

        // Rewards
        if (quest.reward) {
            html += '<div class="section-label">REWARDS</div>';
            html += '<div class="rewards-list"></div>';
        }

        // Actions (only for active quests)
        if (status === QuestStatus.ACCEPTED) {
            html += `<div class="actions">
                <div class="button yellow" onclick="UI.withdrawQuest('${questId}')">Withdraw</div>
            </div>`;
        } else if (status === QuestStatus.COMPLETED) {
            html += `<div class="actions">
                <div class="button disabled">Completed</div>
            </div>`;
        }

        detailsEl.html(html);

        // Add reward item rows (needs to be done after HTML is set)
        if (quest.reward) {
            const rewardsList = detailsEl.find('.rewards-list');
            Object.entries(quest.reward).forEach(([reward, amount]) => {
                rewardsList.append(this.createItemRow(reward, amount));
            });
        }
    },

    /**
     * Withdraw a quest
     * @param {string} questId - Quest identifier
     */
    withdrawQuest(questId) {
        QuestManager.withdraw(questId);
        this.renderQuestList();
        this.log('Quest withdrawn', 'crown');
        sound('click');
    },
    
    /**
     * Add a log message
     * @param {string} text - Message text
     * @param {string} icon - Icon name
     */
    log(text, icon) {
        const logItem = $('<div>' + spcDash(text) + '</div>');
        
        if (icon) {
            logItem.prepend('<img src="assets/item-' + icon + '.webp" />');
        }
        
        $('.log').append(logItem);
        
        setTimeout(() => logItem.remove(), Constants.LOG_DISPLAY_MS);
    },
    
    /**
     * Shake an element
     * @param {jQuery} element - Element to shake
     */
    shake(element) {
        $(element).css('transform', 'scaleY(1.01) translateY(4px)');
        
        setTimeout(() => {
            $(element).css('transform', 'scaleY(1.005) translateY(-2px)');
        }, 100);
        
        setTimeout(() => {
            $(element).css('transform', 'none');
        }, 200);
    },
    
    /**
     * Pop animation for an element
     * @param {jQuery} element - Element to animate
     */
    pop(element) {
        setTimeout(() => {
            $(element).css({
                'transition': 'all 400ms',
                'transform': 'scale(1.5)',
                'z-index': '1000'
            });
        }, 300);
        
        setTimeout(() => {
            $(element).css({
                'transform': 'scale(1)',
                'filter': 'brightness(150%)'
            });
        }, 700);
        
        setTimeout(() => {
            $(element).css('filter', 'none');
        }, 1000);
    },
    
    // ========== PRIVATE HELPERS ==========
    
    _getItemStats(item) {
        const state = GameState;
        const itemData = state.equipments[item];
        let stats = '';
        
        if (itemData.description && itemData.description !== '') {
            stats += '<div class="flex"><div class="tip">' + itemData.description + '</div></div>';
        }
        if (itemData.attack && itemData.attack !== 0) {
            stats += '<div class="flex columns"><label>ATTACK</label><label>' + itemData.attack + '</label></div>';
        }
        if (itemData.defense && itemData.defense !== 0) {
            stats += '<div class="flex columns"><label>DEFENSE</label><label>' + itemData.defense + '</label></div>';
        }
        if (itemData.critical && itemData.critical !== 0) {
            stats += '<div class="flex columns"><label>CRITICAL</label><label>+' + itemData.critical + '%</label></div>';
        }
        
        return stats;
    },
    
    _handleBackpackSort() {
        const state = GameState;
        const sortedItems = [];
        
        $('.backpack .grid .thumb').each(function() {
            const type = $(this).attr('type');
            if (type && type !== 'gold' && state.player.backpack[type] >= 1) {
                sortedItems.push(type);
            }
        });
        
        if ('gold' in state.player.backpack) {
            sortedItems.unshift('gold');
        }
        
        const sortedBackpack = {};
        for (const key of sortedItems) {
            if (key in state.player.backpack) {
                sortedBackpack[key] = state.player.backpack[key];
            }
        }
        
        state.player.backpack = sortedBackpack;
        this.setConsumables();
        GameState.save();
        sound('heavy-item');
    }
};

// Set up global click handler
$(document).on('click', function(e) {
    if (!$(e.target).closest('.card').length &&
        !$(e.target).closest('.button.sell').length &&
        !$(e.target).closest('.backpack').length &&
        !$(e.target).closest('.quests.button').length) {
        UI.closeCard();
    }
    sound('click');
});

// Legacy aliases
const updateMetaTitle = () => UI.updateMetaTitle();
const typeWriterEffect = (el, text, i, cb) => UI.typeWriterEffect(el, text, i, cb);
const zoom = (dir) => UI.zoom(dir);
const openBuyMenu = (item) => UI.openBuyMenu(item);
const buy = (item) => UI.buy(item);
const createItemRow = (item, amount) => UI.createItemRow(item, amount);
const setBackpack = () => UI.setBackpack();
const setConsumables = () => UI.setConsumables();
const setTooltips = () => UI.setTooltips();
const closeCard = (el) => UI.closeCard(el);
const log = (text, icon) => UI.log(text, icon);
const shake = (el) => UI.shake(el);
const pop = (el) => UI.pop(el);
