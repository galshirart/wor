function questDialog(npc) {
	targetQuest = npcs[npc].quests[0]

	for (quest in npcs[npc].quests) {	
		if (!player.questsCompleted.includes(npcs[npc].quests[quest])) {
			targetQuest = npcs[npc].quests[quest]
			break
		}
	}

	step = 0
	
	if (player.questsAccepted.includes(targetQuest)) { step = 1 }

	if (quests[targetQuest].type == 'kill') { 
		for (enemy in quests[targetQuest].requirement) {
			if (!player.enemiesSlained[enemy] || player.enemiesSlained[enemy] < quests[targetQuest].requirement[enemy]) {
				break;
			}
			step = 2;
		}
	}

	if (player.questsCompleted.includes(targetQuest)) {
		step = 3
	}

	card.append('<div class="dialog"></div>')
	lines = quests[targetQuest].dialog[step]
	let lineIndex = 0;

	function showNextLine() {
		clearInterval(dialogInterval);

		if (lineIndex < lines.length) {
			const textDiv = $('<div class="message"><div class="text"></div></div>')
				.appendTo(card.find('.dialog'))
				.find('.text');

			textDiv.text(lines[lineIndex++]);
			dialogInterval = setTimeout(showNextLine, 1000);
		} else {
			card.find('.reward, .actions').remove();

			if (step < 3 && quests[targetQuest].reward) {
				const rewards = $('<div class="flex columns reward"><label>QUEST REWARD</label><div class="list"></div></div>');
				Object.entries(quests[targetQuest].reward).forEach(([reward, amount]) => {
					rewards.find('.list').append(createItemRow(reward, amount));
				});
				card.append(rewards);
			}

			const actions = [
				{ text: "Accept Quest", onclick: `acceptQuest("${targetQuest}")` },
				{ text: "Close", onclick: "closeCard()" },
				{ text: "Accept Reward", onclick: `completeQuest("${targetQuest}")` },
				{ text: "Close", onclick: "closeCard()" }
			];

			const { text, onclick } = actions[step];
			$(`<div class="actions"><div class="button yellow">${text}</div></div>`)
				.appendTo(card)
				.find('.button')
				.attr('onclick', onclick);
		}
	}

	showNextLine();
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