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

	lineIndex = 0;
	function dialogLine() {
		if (lineIndex < lines.length) {
			let text = $('<div class="message"><div class="text"></div></div>').appendTo(card.find('.dialog')).find('.text');
			clearInterval(dialogInterval);

			typeWriterEffect(text, lines[lineIndex++], 0, function() {
				let wait = 0;
				dialogInterval = setInterval(function() {
					wait += 100;
					if (wait >= 400) {
						clearInterval(dialogInterval);
						dialogLine();
					}
				}, 100);
			});
		} else {
			card.find('.reward, .actions').remove();

			if (step < 3 && quests[targetQuest].reward) {
				rewards = $('<div class="flex columns reward"><label>QUEST REWARD</label><div class="list"></div></div>');
				Object.entries(quests[targetQuest].reward).forEach(([reward, amount]) => {
					rewards.find('.list').append(createItemRow(reward, amount));
				});
				card.append(rewards);
			}

			let button = {
				0: { text: "Accept Quest", onclick: `acceptQuest("${targetQuest}")` },
				1: { text: "Close", onclick: "closeCard()" },
				2: { text: "Accept Reward", onclick: `completeQuest("${targetQuest}")` },
				3: { text: "Close", onclick: "closeCard()" }
			};
			$(`<div class="actions"><div class="button yellow">${button[step].text}</div></div>`).appendTo(card)
			.find('.button').attr('onclick', button[step].onclick);
		}
	}
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