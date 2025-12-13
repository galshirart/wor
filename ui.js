function updateMetaTitle() {
	document.querySelector('title').textContent = "Duck Delivery | " + player.location
	.replace(/-/g, ' ')
	.replace(/\b(\w)(\w*'?[a-z]*)/g, function(_, first, rest) {
		if (/'[a-z]+$/.test(rest)) {
			const parts = rest.split("'");
			let afterApos = parts[1];
			if (afterApos && afterApos.toLowerCase() === 's') {
				return first.toUpperCase() + parts[0].toLowerCase() + "'" + afterApos.toLowerCase();
			} else if (afterApos) {
				return first.toUpperCase() + parts[0].toLowerCase() + "'" + afterApos.charAt(0).toUpperCase() + afterApos.slice(1).toLowerCase();
			}
		}
		return first.toUpperCase() + (rest ? rest.toLowerCase() : '');
	});
}

function typeWriterEffect(element, text, i, callback) {
	if (i < text.length) {
		element.html(element.html() + text.charAt(i));
		setTimeout(function() {
			typeWriterEffect(element, text, i + 1, callback);
		}, 28); // adjust speed here
	} else if (callback) {
		callback();
	}
}

function zoom(direction) {
	percentage = (600-player.position)/(i('.map', 'width')-1200)
	$('.front').css('transform-origin', Math.abs(percentage)*100+'% 482px')

	if (direction == 'in') {
	$('body').addClass('zoom')
	} else {
		$('body').removeClass('zoom')
	}
}

function openBuyMenu(item) {
	$('.card.middle').remove()
	card = $('<div class="card middle buy"></div>').appendTo('.window')
	.append(createItemRow(item).css('font-size','16px'))
	.append(itemStats(item))

	card.append('<div class="flex stat price"><label>PRICE</label><div class="list"></div></div>')

	actions = $('<div class="actions"><div class="button yellow">buy</div></div>')
	actions.find('.button').attr('onclick','buy("'+item+'"); $(".card.middle").remove()')

	for (requiredItem in equipments[item].price) {
		amountRequired = equipments[item].price[requiredItem]
		amountAvailable = player.backpack[requiredItem]
		if (amountAvailable == undefined) {
			amountAvailable = 0
		}

		itemRow = createItemRow(requiredItem,amountRequired).appendTo(card.find('.price .list'))

		if (amountAvailable < amountRequired ) {
			itemRow.css('opacity','0.4')
			actions.find('.button').addClass('disabled').attr('onclick','')
		}
	}

	card.append(actions)
}

function itemStats(item) {
	stats = ''
	for (stat in equipments[item]) {
		if (stat == 'description' && equipments[item][stat] != '') {
			stats+='<div class="flex"><div class="tip">'+equipments[item][stat]+'</tip></div>'
		}
		if (stat == 'attack' && equipments[item][stat] != 0) {
			stats+='<div class="flex columns"><label>ATTACK</label><label>'+equipments[item][stat]+'</label></div>'
		}
		if (stat == 'defense' && equipments[item][stat] != 0) {
			stats+='<div class="flex columns"><label>DEFENSE</label><label>'+equipments[item][stat]+'</label></div>'
		}
		if (stat == 'critical' && equipments[item][stat] != 0) {
			stats+='<div class="flex columns"><label>CRITICAL</label><label>+'+equipments[item][stat]+'%</label></div>'
		}
	}
	return stats
}

function buy(item) {
	for (requiredItem in equipments[item].price) {
		amountRequired = equipments[item].price[requiredItem]
		player.backpack[requiredItem] = player.backpack[requiredItem]-amountRequired
		log('Paid '+amountRequired+' '+requiredItem, requiredItem)
	}

	acquire(item)
	pop($('.card.backpack').find('[type='+item+']'))
	sound('heavy-item')
	log('Bought '+item, item)
}

function createItemRow(item, amount) {
	itemRow = $('<div class="item-row flex"></div>')
	itemThumb = $('<div class="thumb"></div>')
	.css('background-image','url(assets/item-'+item+'.webp')
	.appendTo(itemRow)
    itemLabel = (amount != undefined && !equipments.hasOwnProperty(item)) ? amount+' '+spcDash(item) : spcDash(item);
	itemRow.append('<label>'+itemLabel+'</label>')
    return itemRow
}

function setBackpack() {
	$('.bar.gold .value').html(player.backpack.gold.toLocaleString());

	if (player.backpack.gold == 0) {
		$('.bar.gold').hide()
	} else {
		$('.bar.gold').show()
	}

    $('.backpack .thumb').remove();
    for (item in player.backpack) {
        if (player.backpack[item] >= 1 && item != 'gold') {
            let thumb = $('<div class="thumb tooltip"></div>').appendTo('.backpack .grid')
                .attr('type', item)
                .attr('ondblclick', 'equip("' + item + '")')
                .attr('onclick', 'sell("' + item + '")')
                .css('background-image', 'url(assets/item-' + item + '.webp)');
            if (player.backpack[item] > 1) {
                thumb.html('<span class="amount">' + player.backpack[item] + '</span>');
            }
        } else if (item != 'gold') {
            delete player.backpack[item];
        }
    }

    for (item in player.equipments) {
        if (player.equipments[item]) {
            $('.backpack').find('[type=' + player.equipments[item] + ']').addClass('equiped');
        }
    }

	$('.backpack .grid').sortable({
		stop: function(event, ui) {
			sortedItems = [];
			$('.backpack .grid .thumb').each(function() {
				type = $(this).attr('type');
				if (type && type !== "gold" && player.backpack[type] >= 1) {
					sortedItems.push(type);
				}
			});
			if ("gold" in player.backpack) {
				sortedItems.unshift("gold");
			}
			let sortedBackpack = {};
			for (let i = 0; i < sortedItems.length; i++) {
				k = sortedItems[i];
				if (k in player.backpack) {
					sortedBackpack[k] = player.backpack[k];
				}
			}
			player.backpack = sortedBackpack;
			setConsumables()
			save()
			sound('heavy-item')
		}
	});

	setTooltips();
}

function setConsumables() {
	$('.consumables').html('')
	for (item in player.backpack) {
		if (consumables.hasOwnProperty(item)) {
			$('<div class="icon" type="' + item + '"></div>').appendTo('.consumables')
			.css('background-image', 'url(assets/item-' + item + '.webp)')
		}
	}
	activeConsumables.forEach(item => {
		if ($('.consumables [type="' + item + '"]').length == 0) {
			$('<div class="icon" type="' + item + '"></div>').appendTo('.consumables')
			.css('background-image', 'url(assets/item-' + item + '.webp)')
		}

		$('.consumables [type="' + item + '"]').addClass('active');
	});
}

function setTooltips() {
	$('.card.hover').remove();
	$('.tooltip').hover(function(e) {
		card = $('<div class="card hover middle bottom"></div>').appendTo('.window')
		itemType = $(this).attr('type')
		card.append(createItemRow(itemType))

		if ( equipments.hasOwnProperty(itemType) ) {
			card.append('<div><div class="tip">DOUBLE CLICK TO EQUIP</div></div>')
			.append(itemStats(itemType))
		}

		if ( consumables.hasOwnProperty(itemType) ) {
			consumableIndex = $('.consumables .icon[type='+itemType+']').index() + 1;
			card.append('<div><div class="tip">PRESS '+consumableIndex+' TO CONSUME</div></div>')
			card.append('<div class="flex columns"><label>'+consumables[itemType].effect+'</label><label>+'+consumables[itemType].value+'</label></div>')
			if (consumables[itemType].duration > 0) {
				card.append('<div class="flex columns"><label>DURATION</label><label>'+consumables[itemType].duration+' minutes</label></div>')
			}
		}

	}, function() {
	    $('.card.hover').remove();
	})
}

function closeCard(element) {
	zoom('out');
	if (element == 'npc') {
		$('.card.left').remove()
		$('.chat-bubble').removeClass('hide')
	} else {
		$('.card.left').remove()
		$('.card.middle').remove()
		$('.card.backpack').hide()
	}
}

$(document).on('click', function(e) {
	if (!$(e.target).closest('.card').length 
	&& !$(e.target).closest('.button.sell').length
	&& !$(e.target).closest('.backpack').length) {
		closeCard()
	}
	sound('click')
})


function log(text, icon) {
	logItem = $('<div>'+spcDash(text)+'</div>')
	if (icon) {
		logItem.prepend('<img src="assets/item-'+icon+'.webp" />')
	}
	$('.log').append(logItem)
	setTimeout(function(logItem) {
		$(logItem).remove()
	}, 6000, logItem)
}
