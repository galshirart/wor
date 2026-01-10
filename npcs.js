/**
 * NPC Manager Module
 * 
 * Handles NPC interactions, shops, and selling.
 */

const NPCManager = {
    /**
     * Start interaction with an NPC
     * @param {string} npcName - NPC identifier
     */
    interact(npcName) {
        const state = GameState;
        const npcData = state.npcs[npcName];
        
        $('.card.left, .card.middle').remove();
        
        const card = $('<div class="card left npc"></div>')
            .appendTo('.window')
            .addClass(npcData.type)
            .append($('.person-header').clone());
        
        card.find('.avatar').css('background-image', 'url(assets/avatar-' + npcData.name + '.webp)');
        card.find('h3').html(npcData.name);
        card.find('label').html(npcData.title);
        card.attr('id', random(0, 9999999));
        
        Input.showCursor();
        
        if (npcData.type === 'shop') {
            this._setupShop(card, npcData);
        }
        
        if (npcData.type === 'sell') {
            this._setupSellShop(card, npcData);
        }
        
        if (npcData.type === 'quest') {
            this._setupQuestGiver(card, npcData);
        }
        
        UI.zoom('in');
    },
    
    /**
     * Open sell menu for an item
     * @param {string} item - Item type to sell
     */
    sell(item) {
        const state = GameState;
        
		$('.npc.sell .npc-text ~ *').remove();
        $('.npc.sell .tip').parent().remove();
        $('.npc.sell').append(UI.createItemRow(item));
        
        let amount = state.player.backpack[item];
        
        if (amount > 1) {
            $('.npc.sell').append('<div class="flex"><label>AMOUNT:</label><input type="number" value="' + amount + '"/></div>');
        }
        
        const price = this.calcItemPrice(item);
        
        $('.npc.sell')
            .append('<label>SELL FOR <span class="price-value">' + amount * price + '</span></label>')
            .append('<div class="actions"><div class="button" onclick="UI.closeCard()">CANCEL</div><div class="button yellow sell">SELL</div></div>');
        
        // Amount input handler
        $('.npc.sell input').on('input', function(e) {
            const maxAmount = state.player.backpack[item];
            if ($(this).val() > maxAmount) {
                $(this).val(maxAmount);
            }
            amount = $(this).val();
            $('.npc.sell .price-value').html(amount * price);
			e.preventDefault();
        });
        
        // Sell button handler
        $('.npc.sell .actions .button.sell').click(() => {
            this._completeSale(item, amount, price);
        });
    },
    
    /**
     * Calculate sell price for an item
     * @param {string} item - Item type
     * @returns {number} Price in gold
     */
    calcItemPrice(item) {
        const state = GameState;
        
        if (state.equipments.hasOwnProperty(item)) {
            let value = 0;
            for (const requiredItem in state.equipments[item].price) {
                if (requiredItem !== 'gold') {
                    value += this.calcItemPrice(requiredItem) * state.equipments[item].price[requiredItem];
                } else {
                    value += state.equipments[item].price.gold;
                }
            }
            return Math.round(value / 4);
        } else {
            for (const enemy in state.enemies) {
                if (state.enemies[enemy].item === item) {
                    if (Number(state.enemies[enemy].attack) === 0) {
                        return 0;
                    } else {
                        return 1 + Math.round(Number(state.enemies[enemy].attack) / 4);
                    }
                }
            }
        }
        return 0;
    },
    
    // ========== PRIVATE HELPERS ==========
    
    _setupShop(card, npcData) {
        card.append('<div class="npc-text">' + npcData.speech + '</div>');
        $('.backpack').show();
        
        for (const item in npcData.items) {
            UI.createItemRow(npcData.items[item])
                .appendTo(card)
                .attr('onclick', 'UI.openBuyMenu("' + npcData.items[item] + '")');
        }
    },
    
    _setupSellShop(card, npcData) {
        card.append('<div class="npc-text">' + npcData.speech + '</div>');
        $('.backpack').show();
        card.append('<div><div class="tip">Click on an item from your backpack</div></div>');
    },
    
    _setupQuestGiver(card, npcData) {
        const state = GameState;
        let targetQuest = '';
        
        // Loop through all NPC quests and pick the first valid quest that matches requirements
        for (const questId of npcData.quests) {
            const questData = state.quests[questId];
            if (!questData) continue;

            // Check if already completed
            if (state.player.questsCompleted.includes(questId)) {
                continue;
            }

            // If this quest has a condition on *completing* another quest, check it
            if (questData.condition && questData.condition.questCompleted) {
                if (!state.player.questsCompleted.includes(questData.condition.questCompleted)) {
                    continue;
                }
            }

            // If this quest has a condition on *accepting* another quest, check it
            if (questData.condition && questData.condition.questAccepted) {
                if (!state.player.questsAccepted.includes(questData.condition.questAccepted)) {
                    continue;
                }
            }

            targetQuest = questId;
            QuestManager.showDialog(targetQuest, card.attr('id'));
            break;
        }
        
        if (targetQuest === '') {
            const speech = npcData.speech[random(0, npcData.speech.length - 1)];
            const text = $('<div class="dialog"><div class="message"><div class="text"></div></div></div>')
                .appendTo(card)
                .find('.text');
            
            UI.typeWriterEffect(text, speech, 0);
            
            setTimeout(() => {
                $('<div class="actions"><div class="button yellow">CLOSE</div></div>')
                    .appendTo(card)
                    .find('.button')
                    .attr('onclick', 'UI.closeCard()');
            }, 100);
        }
    },
    
    _completeSale(item, amount, price) {
        const state = GameState;
        
        state.player.backpack[item] -= amount;
        
        // Unequip if selling equipped item
        for (const category in state.player.equipments) {
            if (state.player.equipments[category] === item && state.player.backpack[item] < 1) {
                state.player.equipments[category] = '';
            }
        }
        
        state.player.backpack.gold += amount * price;
        sound('pickup-gold');
        
        Player.setHero();
        UI.setBackpack();
        UI.setConsumables();
        
        UI.log('Sold ' + amount + ' ' + item, item);
        UI.log('Received ' + amount * price + ' gold', 'gold');
        
        $('.npc.sell .npc-text ~ *').remove();
        $('.npc.sell .npc-text').html("Deal done. Great doing business with you! Anything else you'd like to sell?");
		$('.npc.sell').append('<div><div class="tip">Click on an item from your backpack</div></div>');
	},
};

// Legacy alias
const npcInteraction = (npc) => NPCManager.interact(npc);
const sell = (item) => NPCManager.sell(item);
const calcItemPrice = (item) => NPCManager.calcItemPrice(item);
