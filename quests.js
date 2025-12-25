function questDialog(targetQuest, cardId) {
	// Clear any existing dialog interval from previous interactions
	clearInterval(dialogInterval);

	step = 0
	buttonText = 'Accept Quest'
	buttonAction = `acceptQuest("${targetQuest}")`
	
	if (player.questsAccepted.includes(targetQuest)) { 
		step = 1 
		buttonText = 'Close'
		buttonAction = 'closeCard()'
	}

	if (quests[targetQuest].type == 'kill') { 
		for (enemy in quests[targetQuest].requirement) {
			if (!player.enemiesSlained[enemy] || player.enemiesSlained[enemy] < quests[targetQuest].requirement[enemy]) {
				break;
			}
			step = 2;
			buttonText = 'Complete Quest'
			buttonAction = `completeQuest("${targetQuest}")`
		}
	}

	if (quests[targetQuest].type == 'visit') { 
		if (player.mapsVisited.includes(quests[targetQuest].requirement)) {
			step = 2;
			buttonText = 'Complete Quest'
			buttonAction = `completeQuest("${targetQuest}")`
		}
	}

	let card = $('.card#' + cardId)

	card.append('<div class="dialog"></div>')
	let lines = quests[targetQuest].dialog[step]

	let lineIndex = 0;
	let skipDialog = false;

	function showAllDialogLines() {
		card.find('.dialog').empty();
		for (let i = 0; i < lines.length; i++) {
			$('<div class="message"><div class="text"></div></div>')
				.appendTo(card.find('.dialog'))
				.find('.text').text(lines[i]);
		}
		// Only show reward and actions if they aren't shown already
		if (card.find('.reward, .actions').length === 0) {
			showRewardAndActions();
		}
	}

	function showRewardAndActions() {
		card.find('.reward, .actions').remove();

		if (step < 3 && quests[targetQuest].reward) {
			rewards = $('<div class="flex columns reward"><label>QUEST REWARD</label><div class="list"></div></div>');
			Object.entries(quests[targetQuest].reward).forEach(([reward, amount]) => {
				rewards.find('.list').append(createItemRow(reward, amount));
			});
			card.append(rewards);
		}
		
		$(`<div class="actions"><div class="button yellow">${buttonText}</div></div>`).appendTo(card)
		.find('.button').attr('onclick', buttonAction);
	}

	function dialogLine() {
		if (!card.length || !card.closest('body').length) {
			return;
		}

		if (skipDialog) {
			showAllDialogLines();
			return;
		}

		if (lineIndex < lines.length) {
			let text = $('<div class="message"><div class="text"></div></div>').appendTo(card.find('.dialog')).find('.text');
			clearInterval(dialogInterval);

			typeWriterEffect(text, lines[lineIndex++], 0, function() {
				// Don't proceed if card was removed during typing
				if (!card.length || !card.closest('body').length) {
					return;
				}
				let wait = 0;
				let localInterval = setInterval(function() {
					if (skipDialog) {
						clearInterval(localInterval);
						showAllDialogLines();
						return;
					}
					wait += 100;
					if (wait >= 400) {
						clearInterval(localInterval);
						dialogLine();
					}
				}, 100);
				dialogInterval = localInterval;
			});
		} else {
			showRewardAndActions();
		}
	}

	// Set up a keydown listener to skip dialog on spacebar
	let spaceHandler = function(e) {
		if (e.code === "Space" && !skipDialog) {
			skipDialog = true;
			clearInterval(dialogInterval);
			showAllDialogLines();
		}
	};
	$(document).on('keydown.questDialog', spaceHandler);

	// Remove space handler if card is removed
	let observer = new MutationObserver(function() {
		if (!card.length || !card.closest('body').length) {
			$(document).off('keydown.questDialog', spaceHandler);
			observer.disconnect();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });

	dialogLine();
}

function acceptQuest(quest) {
	player.questsAccepted.push(quest)
	closeCard()
	placePorts()
	sound('quest')
}

function completeQuest(quest) {
	if (quests[quest].type == 'collect') {
		player.backpack[quests[quest].requirement] -= quests[quest].amount
		log('Delivered '+(quests[quest].amount > 1 ? quests[quest].amount+' ' : '')+quests[quest].requirement, quests[quest].requirement)
	}

	for (reward in quests[quest].reward) {
		amount = quests[quest].reward[reward];
		log('Rewarded '+(amount > 1 ? amount+' ' : '')+reward, reward)
		acquire(reward, amount)
		setTimeout(() => { $('.card.backpack').show() }, 500)
	}

	player.questsCompleted.push(quest)
	log('Quest completed', 'crown')
	closeCard()
	sound('quest')
}

function resetQuests() {
	player.questsCompleted = []
	player.questsAccepted = []
	player.enemiesSlained = {}
}