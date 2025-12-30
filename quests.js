/**
 * Quest Manager Module
 * 
 * Handles quest dialog, acceptance, and completion.
 */

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
        
        // Determine quest step
        if (state.player.questsAccepted.includes(targetQuest)) {
            step = 1;
            buttonText = 'Close';
            buttonAction = 'UI.closeCard()';
        }
        
        const quest = state.quests[targetQuest];
        
        // Check completion conditions
        if (quest.type === 'kill') {
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
                buttonText = 'Complete Quest';
                buttonAction = `QuestManager.complete("${targetQuest}")`;
            }
        }
        
        if (quest.type === 'visit') {
            if (state.player.mapsVisited.includes(quest.requirement)) {
                step = 2;
                buttonText = 'Complete Quest';
                buttonAction = `QuestManager.complete("${targetQuest}")`;
            }
        }

		if (quest.type === 'collect') {
            const requirementKey = Object.keys(quest.requirement)[0];
            if (state.player.backpack[requirementKey] >= quest.requirement[requirementKey]) {
                step = 2;
                buttonText = 'Complete Quest';
                buttonAction = `QuestManager.complete("${targetQuest}")`;
            }
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
            
            $(`<div class="actions"><div class="button yellow">${buttonText}</div></div>`)
                .appendTo(card)
                .find('.button')
                .attr('onclick', buttonAction);
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
        UI.closeCard();
        MapManager.placePorts();
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
            state.player.backpack[questData.requirement] -= questData.amount;
            const amountText = questData.amount > 1 ? questData.amount + ' ' : '';
            UI.log('Delivered ' + amountText + questData.requirement, questData.requirement);
        }
        
        // Grant rewards
        for (const reward in questData.reward) {
            const amount = questData.reward[reward];
            const amountText = amount > 1 ? amount + ' ' : '';
            UI.log('Rewarded ' + amountText + reward, reward);
            Player.acquire(reward, amount);
            setTimeout(() => $('.card.backpack').show(), 500);
        }
        
        state.player.questsCompleted.push(quest);
        UI.log('Quest completed', 'crown');
        UI.closeCard();
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
    }
};

// Legacy aliases
const questDialog = (quest, cardId) => QuestManager.showDialog(quest, cardId);
const acceptQuest = (quest) => QuestManager.accept(quest);
const completeQuest = (quest) => QuestManager.complete(quest);
const resetQuests = () => QuestManager.reset();
