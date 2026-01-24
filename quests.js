/**
 * Quest Manager Module
 * 
 * Handles quest dialog, acceptance, and completion.
 */

const QuestStatus = {
    NOT_STARTED: 'NOT_STARTED',
    ACCEPTED: 'ACCEPTED',
    COMPLETED: 'COMPLETED'
};

const QuestManager = {
    /**
     * Show quest dialog
     * @param {string} targetQuest - Quest identifier
     * @param {string} cardId - ID of the card element
     */
    showDialog(targetQuest, cardId) {
        const state = GameState;
        
        // Clear any existing dialog interval
        clearInterval(state.dialogInterval);
        
        let step = 0;
        let buttonText = 'Accept Quest';
        let buttonAction = `QuestManager.accept("${targetQuest}")`;
        let buttonColor = '';
        
        // Determine quest step
        if (state.player.questsAccepted.includes(targetQuest)) {
            step = 1;
            buttonText = 'Close';
            buttonAction = 'UI.closeCard()';
        }
        
        const quest = state.quests[targetQuest];
        
        // Check completion conditions
        if (quest.type === 'kill' && state.player.questsAccepted.includes(targetQuest)) {
            let allKilled = true;
            for (const enemy in quest.requirement) {
                if (!state.player.enemiesSlained[enemy] || 
                    state.player.enemiesSlained[enemy] < quest.requirement[enemy]) {
                    allKilled = false;
                    break;
                }
            }
            if (allKilled) {
                step = 2;
            }
        }
        
        if (quest.type === 'visit' && state.player.questsAccepted.includes(targetQuest)) {
            if (state.player.mapsVisited.includes(quest.requirement)) {
                step = 2;
            }
        }

		if (quest.type === 'collect' && state.player.questsAccepted.includes(targetQuest)) {
            const requirementKey = Object.keys(quest.requirement)[0];
            if (state.player.backpack[requirementKey] >= quest.requirement[requirementKey]) {
                step = 2;
            }
        }

        if (step === 2) {
            buttonColor = 'yellow';
            buttonText = 'Complete Quest';
            buttonAction = `QuestManager.complete("${targetQuest}")`;
        }
        
        const card = $('.card#' + cardId);
        card.append('<div class="dialog"></div>');
        
        const lines = quest.dialog[step];
        let lineIndex = 0;
        let skipDialog = false;
        
        const showAllDialogLines = () => {
            card.find('.dialog').empty();
            for (let i = 0; i < lines.length; i++) {
                $('<div class="message"><div class="text"></div></div>')
                    .appendTo(card.find('.dialog'))
                    .find('.text')
                    .text(lines[i]);
            }
            if (card.find('.reward, .actions').length === 0) {
                showRewardAndActions();
            }
        };
        
        const showRewardAndActions = () => {
            card.find('.reward, .actions').remove();
            
            if (step < 3 && quest.reward) {
                const rewards = $('<div class="flex columns reward"><label>QUEST REWARD</label><div class="list"></div></div>');
                Object.entries(quest.reward).forEach(([reward, amount]) => {
                    rewards.find('.list').append(UI.createItemRow(reward, amount));
                });
                card.append(rewards);
            }
            
            $(`<div class="actions"><div class="button">${buttonText}</div></div>`)
                .appendTo(card)
                .find('.button')
                .attr('onclick', buttonAction)
                .addClass(buttonColor ?? 'yellow');
        };
        
        const dialogLine = () => {
            if (!card.length || !card.closest('body').length) {
                return;
            }
            
            if (skipDialog) {
                showAllDialogLines();
                return;
            }
            
            if (lineIndex < lines.length) {
                const text = $('<div class="message"><div class="text"></div></div>')
                    .appendTo(card.find('.dialog'))
                    .find('.text');
                
                clearInterval(state.dialogInterval);
                
                UI.typeWriterEffect(text, lines[lineIndex++], 0, () => {
                    if (!card.length || !card.closest('body').length) {
                        return;
                    }
                    
                    let wait = 0;
                    const localInterval = setInterval(() => {
                        if (skipDialog) {
                            clearInterval(localInterval);
                            showAllDialogLines();
                            return;
                        }
                        wait += 100;
                        if (wait >= Constants.DIALOG_LINE_PAUSE_MS) {
                            clearInterval(localInterval);
                            dialogLine();
                        }
                    }, 100);
                    
                    state.dialogInterval = localInterval;
                });
            } else {
                showRewardAndActions();
            }
        };
        
        // Space to skip dialog
        const spaceHandler = (e) => {
            if (e.code === 'Space' && !skipDialog) {
                skipDialog = true;
                clearInterval(state.dialogInterval);
                showAllDialogLines();
            }
        };
        
        $(document).on('keydown.questDialog', spaceHandler);
        
        // Clean up handler when card removed
        const observer = new MutationObserver(() => {
            if (!card.length || !card.closest('body').length) {
                $(document).off('keydown.questDialog', spaceHandler);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        dialogLine();
    },
    
    /**
     * Accept a quest
     * @param {string} quest - Quest identifier
     */
    accept(quest) {
        GameState.player.questsAccepted.push(quest);
		UI.log('Quest accepted', 'exclamation-mark');
        UI.closeCard();
        MapManager.placePorts();

		// Open quests card and select the quest
		UI.toggleQuestsCard(forceOpen = false)
		$('.quests').show().find('[data-quest-id="'+quest+'"]').trigger('click');

        sound('quest');
    },
    
    /**
     * Complete a quest
     * @param {string} quest - Quest identifier
     */
    complete(quest) {
        const state = GameState;
        const questData = state.quests[quest];
        
        // Handle collect quests
        if (questData.type === 'collect') {
			for (const [item, amount] of Object.entries(questData.requirement)) {
				state.player.backpack[item] -= amount;
				const amountText = amount > 1 ? amount + ' ' : '';
				UI.log('Delivered ' + amountText + item, item);
			}
            setBackpack();
        }
        
        // Grant rewards
        for (const reward in questData.reward) {
            const amount = questData.reward[reward];
            const amountText = amount > 1 ? amount + ' ' : '';
            UI.log('Rewarded ' + amountText + reward, reward);
            Player.acquire(reward, amount);

            if (reward.includes('-map')) {
                $('.button.continent-map').show();
            } else {
                setTimeout(() => $('.card.backpack').show(), 500);
            }
        }
        
        state.player.questsCompleted.push(quest);
        UI.log('Quest completed', 'crown');
        UI.closeCard();
		MapManager.placePorts();
        sound('quest');
    },
    
    /**
     * Reset all quest progress (for debugging)
     */
    reset() {
        const state = GameState;
        state.player.questsCompleted = [];
        state.player.questsAccepted = [];
        state.player.enemiesSlained = {};
    },
    /**
     * Withdraw a quest
     * @param {string} questId - Quest identifier
     */
    withdraw(questId)
    {
        const state = GameState;
        const questIndex = state.player.questsAccepted.indexOf(questId);
        if (questIndex > -1) {
            state.player.questsAccepted.splice(questIndex, 1);
        }
    },
    /**
     * Get the status of a quest
     * @param {string} questId - Quest identifier
     */
    getStatus(questId)
    {
        const state = GameState;
        if (state.player.questsCompleted.includes(questId)) {
            return QuestStatus.COMPLETED;
        }
        if (state.player.questsAccepted.includes(questId)) {
            return QuestStatus.ACCEPTED;
        }
        return QuestStatus.NOT_STARTED;
    },
    /**
     * Get the objective progress of a quest
     * @param {string} questId - Quest identifier
     * @returns {Object|null} - Progress object or null if quest not found
     */
    getObjectiveProgress(questId)
    {
        const state = GameState;
        const quest = state.quests[questId];
        if (!quest) return null;

        if (quest.type === 'collect') {
            // requirement can be an object like {"stolen-gear": 1} or a string
                const items = [];
                for (const item in quest.requirement) {
                    items.push({
                        name: item,
                        collected: state.player.backpack[item] || 0,
                        total: quest.requirement[item]
                    });
                }
                return {
                    type: 'collect',
                    items: items
                };
        }
        
        if (quest.type === 'kill') {
            const enemies = [];
            for (const enemy in quest.requirement) {
                enemies.push({
                    name: enemy,
                    killed: state.player.enemiesSlained[enemy] || 0,
                    total: quest.requirement[enemy]
                });
            }
            return {
                type: 'kill',
                enemies: enemies
            };
        }
        
        if (quest.type === 'visit') {
            return {
                type: 'visit',
                location: quest.requirement,
                visited: state.player.mapsVisited.includes(quest.requirement)
            };
        }

        return null;
    }

};


// Legacy aliases
const questDialog = (quest, cardId) => QuestManager.showDialog(quest, cardId);
const acceptQuest = (quest) => QuestManager.accept(quest);
const completeQuest = (quest) => QuestManager.complete(quest);
const resetQuests = () => QuestManager.reset();
