function sell(item) {
	$('.npc.sell .speech ~ *').remove()
	$('.npc.sell').append(createItemRow(item))

	amount = player.backpack[item]
	if (amount > 1) {
		$('.npc.sell').append('<div class="flex"><label>AMOUNT:</label><input type="number" value="'+amount+'"/></div>')
	}
	
	$('.npc.sell').append('<label>SELL FOR:</label>')
	.append(createItemRow('gold',amount*calcItemPrice(item)).addClass('sell-price'))
	.append('<div class="actions"><div class="button" onclick="closeCard()">CANCEL</div><div class="button yellow sell">SELL</div></div>')

	$('.npc.sell input').on('input',function() {
		if ($(this).val() > player.backpack[item]) {
			$(this).val(player.backpack[item])
		}
		amount = $(this).val()
		$('.npc.sell .sell-price label').html(amount*calcItemPrice(item))
	})

	$('.npc.sell .actions .button.sell').click(function() {
		player.backpack[item] = player.backpack[item]-amount

		for (category in player.equipments) {
			if (player.equipments[category] == item && player.backpack[item] < 1) {
				player.equipments[category] = ''
			}
		}

		player.backpack.gold += amount*calcItemPrice(item)
		sound('pickup-gold')
		setHero()
		setBackpack()
		setConsumables()

		log('Sold '+amount+' '+item, item)
		log('Received '+amount*calcItemPrice(item)+' gold', 'gold')

		$('.npc.sell .speech ~ *').remove()
		$('.npc.sell .speech div').html("Deal done. Great doing business with you! Anything else you'd like to sell?")
	})
}

function calcItemPrice(item) {
	if (equipments.hasOwnProperty(item)) {
		value=0
		for ( requiredItem in equipments[item].price ) {
			if ( requiredItem != 'gold' ) {
				value += calcItemPrice(requiredItem)*equipments[item].price[requiredItem]
			} else {
				value+=equipments[item].price.gold
			}
		}
		return Math.round(value/4)
	} else {
		for (enemy in enemies) {
			if (enemies[enemy].item == item) {
				if (enemies[enemy].attack == 0 ){
					return '0'
				} else {
					return 1+Math.round(enemies[enemy].attack/4)
				}
			}
		}
	}
}

function npcInteraction(npc) {
	$('.card.left, .card.middle').remove()
	card = $('<div class="card left npc"></div>').appendTo('.window')
	.addClass(npcs[npc].type)
	.append($('.person-header').clone())
	.find('.avatar').css('background-image', 'url(assets/avatar-' + npcs[npc].name + '.webp)')
	.end()
	card.find('h3').html(spcDash(npcs[npc].name))
	card.find('label').html(spcDash(npcs[npc].title))
	card.attr('id', random(0, 9999999))

	showCursor()

	if (npcs[npc].type == 'shop') {
		card.append('<div class="speech"><div>'+npcs[npc].speech+'</div></div>')
		$('.backpack').show()
		for (item in npcs[npc].items) { 
			createItemRow(npcs[npc].items[item]).appendTo(card)
			.attr('onclick','openBuyMenu("'+npcs[npc].items[item]+'")')
		}
	}

	if (npcs[npc].type == 'sell') {
		card.append('<div class="speech"><div>'+npcs[npc].speech+'</div></div>')
		$('.backpack').show()
		card.append('<div><div class="tip">Click on an item from your backpack</div></div>')
	}

	if (npcs[npc].type == 'quest') {
		targetQuest = ''

		for (quest in npcs[npc].quests) {	
			if (!player.questsCompleted.includes(npcs[npc].quests[quest])) {
				targetQuest = npcs[npc].quests[quest]
				questDialog(targetQuest, card.attr('id'))
				break
			}
		}

		if (targetQuest == '') {
			let text = $('<div class="dialog"><div class="message"><div class="text"></div></div></div>').appendTo(card).find('.text');
			speech = npcs[npc].speech[random(0, npcs[npc].speech.length - 1)]
			typeWriterEffect(text, speech, 0)
			setTimeout(function() {
				$(`<div class="actions"><div class="button yellow">CLOSE</div></div>`).appendTo(card)
				.find('.button').attr('onclick', 'closeCard()');
			}, 100);
		}
	}
	
	zoom('in');
}