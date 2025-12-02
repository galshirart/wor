player = {}
fetch('https://galshir.com/php/wor.php')
.then(res => res.json())
.then(data => {
	maps = data['maps']
	enemies = data['enemies']
	equipments = data['equipments']
	skills = data['skills']
	npcs = data['npcs']
	quests = data['quests']

	player = JSON.parse(localStorage.getItem('player'))
	if (!player || player.version != '3') { resetPlayer() }

	keyState = {left: false, right: false};
	heroDirection = 1
	attackCooldown = false;
	skillCooldown = false;
	projectileActive = false;
	tutorialInterval = null;

	document.onkeydown = (e) => {
		switch(e.keyCode) {
			case 39: keyState.right = true; break;
			case 37: keyState.left = true; break;
			case 38: jump(); break;
			case 65: if (!attackCooldown) fight(); break;
			// case 83: if (!skillCooldown) useSkill('s'); break;
			// case 68: if (!skillCooldown) useSkill('d'); break;
			case 90: pickUp(); break;
			case 32: interact(); break;
			case 66: $('.card.backpack').toggle(); break;
			case 27: closeCard(); break;
		}
	}
	
	document.onkeyup = (e) => {
		switch(e.keyCode) { 
			case 39: keyState.right = false; break;
			case 37: keyState.left = false; break;
		}
	}

	setHero()
	setBackpack()
	enterMap()
})

function enterMap(originMap) {
    $('.overlay').css('opacity', 1);

	imagesToLoad = [];
	imagesToLoad.push(`assets/map-${player.location}.webp`);
	if (maps[player.location].layers.includes('front')) imagesToLoad.push(`assets/map-${player.location}-front.webp`);
	if (maps[player.location].layers.includes('back')) imagesToLoad.push(`assets/map-${player.location}-back.webp`);

	(Object.keys(maps[player.location].enemies)).forEach(type => {
		imagesToLoad.push(`assets/enemy-${type}.webp`);
		imagesToLoad.push(`assets/item-${enemies[type].item}.webp`);
	});
	(Object.keys(maps[player.location].npc)).forEach(npc => {
		imagesToLoad.push(`assets/npc-${npc}.webp`);
		imagesToLoad.push(`assets/avatar-${npc}.webp`);
	});

	setTimeout(() => {
		$('.back, .front').remove();
		$('.field').html('').append(`<img class="map" src="assets/map-${player.location}.webp" />`);
		(maps[player.location].layers || []).forEach(layer =>
			$('.field').after(`<img class="${layer}" src="assets/map-${player.location}-${layer}.webp" />`)
		);
	}, 100);

	Promise.all(imagesToLoad.map(src => {
		return new Promise((resolve, reject) => {
			const img = new window.Image();
			img.onload = resolve;
			img.onerror = resolve;
			img.src = src;
		});
	})).then(() => {
		setTimeout(() => {
			if (originMap) { player.position = 634 + (i('.map', 'width') - 1270) * (maps[player.location].ports[originMap] || 0) / 100; }

			mapWidth = i('.map', 'width');
			backWidth = i('.back', 'width');
			frontWidth = i('.front', 'width');
			walk(keyState);

			Object.keys(maps[player.location].enemies || {}).forEach(type => { Array.from({ length: maps[player.location].enemies[type] }).forEach(() => enemySpawn(type, player.location)); });
			Object.keys(maps[player.location].ports || {}).forEach(placePort);
			Object.keys(maps[player.location].npc || {}).forEach(placeNPC);
		
			if (!player.mapsVisited.includes(player.location)) {
				player.mapsVisited.push(player.location);
				setTimeout(() => monologue(maps[player.location].monologue), 2000);
			}

			if (['a-box', 'box-shore'].includes(player.location)) setTutorial();
		}, 200);

		setTimeout(() => {
			gameBeat = setInterval(() => {
				walk(keyState);
				collide();
				recover();
				save();
			}, 100);

			$('.overlay').css('opacity', 0);
			$('.mapsign').remove();
			$('.window').append(`<div class="mapsign"><span></span><span>${spcDash(player.location)}</span><span></span></div>`);
			$('.port').addClass('active');
		}, 300);
	});
}

function walk(keyState) {
	if (mode() === 'fight' || skillCooldown) return;
	isWalking = false

	if (keyState.right) {
		isWalking = true;
		change = player.speed;
	} else if (keyState.left) {
		isWalking = true;
		change = -player.speed;
	}

	if (isWalking) {
		heroDirection = Math.sign(change);
		hero.css('transform', 'scaleX(' + heroDirection + ')').attr('direction', heroDirection);
		if (mode() !== 'jump') mode('walk');
		player.position += change;
		hideCursor();
	} else if (mode() !== 'jump') {
		mode('rest');
	}

	if (player.position < 610) player.position = 610;
	if (mapWidth > 1 && player.position > mapWidth - 610) player.position = mapWidth - 610;

	$('.field .npc').each(function() {
		near = player.position >= i(this, 'left') - 60 && player.position <= i(this, 'left') + i(this, 'width') + 60;
		$(this).toggleClass('near-player', near);
	});

	if ($('.field .npc.near-player').length === 0) {
		closeCard('npc');
	}

	windowWidth = i('.window', 'width');
	offset = (windowWidth / 2) - player.position;
	$('.field').css('left', offset + 'px');
	parallaxRatio = (mapWidth - windowWidth) > 0 ? (offset / (mapWidth - windowWidth)) : 0;
	$('.back').css('left', parallaxRatio * (backWidth - windowWidth) + 'px');
	$('.front').css('left', parallaxRatio * (frontWidth - windowWidth) + 'px');
}

function placePort(port) {
	portX = 590 + (i('.map','width') - 1270) * maps[player.location].ports[port] / 100

	$("<div class='port'></div>")
	.css('left', portX)
	.attr('target',port)
	.appendTo('.field')

	$("<div class='sparkles'></div>")
	.css('left', portX)
	.appendTo('.field')
}

function placeNPC(npc) {
	npcX = 600 + (i('.map','width') - 1200) * maps[player.location].npc[npc][0] / 100
	npcX = npcX - npcs[npc].size[0] / 2
				
	npcElement = $("<div class='npc'><div class='image'></div></div>")
	.css('left', npcX)
	.css('margin-bottom', maps[player.location].npc[npc][1]+'px')
	.find('.image')
	.css({
		'background-image': 'url(assets/npc-' + npc + '.webp)',
		'background-size': npcs[npc].size[0] * 5 + 'px',
		'width': npcs[npc].size[0],
		'height': npcs[npc].size[1]
	})
	.end()
	.attr({
		'questID': npcs[npc].questID,
		'npc-name': npc
	})
	.append('<div class="chat-bubble dots"></div>')
	.appendTo('.field');
}

function setTutorial() {
	$('.ui.bottom').hide();
	$('.log').hide();
	if (tutorialInterval) return;
	tutorialInterval = setInterval(() => {
		if (player.location == 'box-shore') { 
			$('.ui.bottom').show();
			$('.log').show();
		}

		$('.tutorial').removeClass('show');

		if (player.location == 'a-box') { 
			if (player.position < 1000) {
				$('[tutorial=move]').addClass('show');
			} else {
				$('[tutorial=move]').removeClass('show');
			}

			if (player.position > 1300) {
				$('[tutorial=travel]').addClass('show');
			} else {
				$('[tutorial=travel]').removeClass('show');
			}
		}
		if (player.location == 'box-shore') { 
			if (player.position > 1100 && player.position < 1400) {
				$('[tutorial=jump]').addClass('show');
			} else {
				$('[tutorial=jump]').removeClass('show');
			}	
		}
		if (player.location == 'box-shore') { 
			if (player.position > 1900 && player.position < 2090) {
				$('[tutorial=interact]').addClass('show');
			} else {
				$('[tutorial=interact]').removeClass('show');
			}	
		}
		if ($('.card.left.npc').is(':visible')) {
			$('[tutorial=interact]').remove();
		}
	}, 200)
}

function jump() {
	if (mode() == 'fight' || mode() == 'jump' || skillCooldown) return
	mode('jump')
	hero.addClass('jumping')
	setTimeout(() => hero.removeClass('jumping'), 400);
	setTimeout(() => { mode('rest'); sound('land') }, 790);
	sound('jump')
}

function fight(atkType = random(1,5), rangeStart = 0, rangeEnd = 0, atkMultiplier=1, maxTargets=1) {
    if (mode() == 'fight' || mode() == 'jump' || attackCooldown) return
    attackCooldown = true;
    mode('fight')

	if (equipments[player.equipments.weapon].type == 'melee') {
		x1 = player.position+rangeStart
		x2 = player.position+rangeEnd+i('.weapon','height')
	
		if (heroDirection == -1) { 
			x1 = player.position-i('.weapon','height')-rangeEnd
			x2 = player.position-rangeStart
		}

		setTimeout(() => {
			handleAttackHits(x1, x2, atkMultiplier, maxTargets)
		}, 200)
	}

	if (equipments[player.equipments.weapon].type == 'range') {
		atkType = 7

		if (projectileActive) { 
			clearInterval(projectile)
			projectileElement.remove()
			projectileActive = false;
		}

		setTimeout(() => {
			x1 = player.position
			x2 = player.position
			projectileElement = $('<div class="projectile"></div>').css({
				'transform': 'scaleX('+heroDirection+')'
			}).appendTo('.field')

			projectile = setInterval((direction) => {
				projectileActive = true;
				x1 = x1 + direction*10;
				x2 = x2 + direction*10;
				projectileElement.css('left', x1-40)
				handleAttackHits(x1, x2, atkMultiplier, maxTargets)
				if (Math.abs(x1 - player.position) > 500) {
					clearInterval(projectile);
					projectileElement.remove();
				}
			}, 10, heroDirection)
		}, 200)
	}

	// showRange(x1,x2)
	hero.attr('atkType',atkType)
    $('.weapon').css('animation-name','weapon-'+atkType)
    sound('attack-'+atkType)

    setTimeout(() => { 
        mode('rest')
        $('.weapon').css('animation-name','')

		if (equipments[player.equipments.weapon].type == 'range') {
			setTimeout(() => {
				attackCooldown = false;
			}, 300)
		} else {
			attackCooldown = false;
		}
    },390)
}

function handleAttackHits(x1, x2, atkMultiplier, maxTargets) {
    enemiesAttacked = 0
    $('.enemy[active=true][hitable=TRUE]').each(function() {
        if ( x1 > i($(this),'left')+i($(this),'width') || x2 < i($(this),'left') ) return

        attack = spread(equipments[player.equipments.weapon].attack*atkMultiplier,20)
		iscritical = random(1, 100) <= player.critical
        if (iscritical) {
            attack = Math.round(attack * player.criticalMultiplier)
        }
		
        $(this).attr({
            'state': 'enemy-hit',
            'angry': 'true', 
            'hp': $(this).attr('hp')-attack,
            'hit-count': $(this).attr('hit-count')*1+1
		})
        .css({
			'transition-duration': '50ms',
			'transition-timing-function': 'ease-out',
            'left': i($(this),'left')+heroDirection*5+'px'
        })
        .find('.bar').css('width', $(this).attr('hp')/enemies[$(this).attr('type')].hp*100+'%')

		damageColor = iscritical ? 'orange' : 'yellow'
        hit = $('<div class="hit'+(iscritical ? ' critical' : '')+'">'+prettyNumber(attack, damageColor)+'</div>')
            .css('left', i($(this),'left'))
            .appendTo('.field')
        setTimeout((hit)=> { hit.remove() },800, hit)

        if ($(this).attr('hp') <= 0) { enemyDeath($(this)) } 
        else { setTimeout(() => {
			$(this).css('transition-timing-function', 'linear')
            enemyMove($(this), $(this).attr('hit-count'))
        }, 200) }
    
        setTimeout(function() {
            sound('hit-'+random(1,3)) 
        },enemiesAttacked*50)

        if (++enemiesAttacked == maxTargets) {
			if (equipments[player.equipments.weapon].type == 'range') {	
				clearInterval(projectile)
				projectileElement.remove()
			}
			return false
		}
    });
}

function useSkill(key) {
    if (mode() == 'fight' || mode() == 'jump' || skillCooldown) { return }

    //based on the weapon data:
    if (key == 's') { skill = 'surge'  }
    if (key == 'd') { skill = 'impact' }

    mpCost = (equipments[player.equipments.weapon].attack*skills[skill].atkMultiplier)/2
    if (player.mp < mpCost) { shake($('.bar.mp').parent('.bar-container')); return }
    player.mp = player.mp-mpCost
    
    skillCooldown = true;

    skillSprite = $('<div class="skill"></div>').css({
        'transform' :'scaleX('+heroDirection+')',
        'background-image': 'url(assets/skill-'+skill+'.webp)'
    })

    if (skill == 'surge' && equipments[player.equipments.weapon].type == 'melee') {
		player.position = player.position+heroDirection*100
        fight(atkType=1, rangeStart=0,rangeEnd=120, skills[skill].atkMultiplier, maxTargets=2)
        sound('swoosh')
        hero.after(skillSprite)
    }

    if (skill == 'impact' && equipments[player.equipments.weapon].type == 'melee') {
        fight(atkType=6, rangeStart=-100,rangeEnd=80, skills[skill].atkMultiplier, maxTargets=6)
        sound('spell-1')
        setTimeout(function() {
            hero.after(skillSprite)
            shake($('.field'))
            sound('rumble')
        },200)
    }

    setTimeout(function() { 
        mode('rest')
        hero.css('transform','scaleX('+heroDirection+') translateX(0)')
        $('.skill').remove()
        skillCooldown = false;
    }, 600)
}

function enemySpawn(type,map) {
	if (map != player.location) { return }

	destination = random(800, i('.map','width')-800)
	yOffset = random(-5,5)

	enemy = $('<div class="enemy" type="'+type+'"><div class="image"></div><div class="hpBar"><div class="bar"></div></div></div>')
	.appendTo('.field')
	.css({
		'left': destination,
		'margin-bottom': yOffset+'px',
		'z-index': hero.css('z-index')-yOffset
	})
	.attr({
		'hp': enemies[type].hp,
		'hit-count': 0,
		'hitable': enemies[type].hitable
	})
	.find('.image').css({
		'background-image': 'url(assets/enemy-'+type+'.webp)',
		'width': enemies[type].size[0],
		'height': enemies[type].size[1]
	}).end()

	$(enemy).fadeIn(1000).promise().done(function(enemy) {
		enemy.attr('active','true')
	})

	enemyMove(enemy, 0)
}

function enemyMove(enemy, hitCount) {
	if ( $(enemy).attr('active') == 'false'
	|| hitCount < enemy.attr('hit-count'))
	{ return }

	if (enemies[enemy.attr('type')].speed == 0) {
		enemy.attr('state','move').find('.image').css('animation-duration', 500+'ms')
		
		if (enemy.attr('type') == 'burning-plank') {
			enemy.css('left', 1300+'px')
		}
		return
	}

	minX = 600
	maxX = i('.map', 'width') - 600
	currentX = i(enemy, 'left')

	speed = spread(enemies[enemy.attr('type')].speed, 30)

	if (enemy.attr('angry') == 'true') {
		desired = player.position - currentX - i(enemy, 'width') / 2 + random(-100, 100)
		destX = Math.max(minX, Math.min(maxX, currentX + desired))
		distance = destX - currentX
		speed = speed/1.2
		stand = 0
	} else {
		range = 200
		distance = Math.max(minX - currentX, Math.min(maxX - currentX, random(-range, range)))
		stand = random(1000, 4000)
		setTimeout(function(enemy) {
			if (enemy.attr('angry') == 'true') return
			enemy.attr('state','stand')
		}, Math.abs(distance) * speed, enemy)
	}

	if (distance == 0) { distance = 1 }

	enemy.attr('state','move')
	.css({
		'left': i(enemy,'left')+distance,
		'transform': 'scaleX('+sign(distance)+')',
		'transition-duration': abs(distance)*speed+'ms',
	})
	.find('.hpBar').css('transform','scaleX('+sign(distance)+')')

	setTimeout(function(enemy) {
		enemyMove(enemy, hitCount)
	}, abs(distance)*speed+stand, enemy)
}

function collide() {
	$('.enemy[active=true]').each(function() {
		if (player.position+10 < i($(this),'left') ||
			player.position-10 > i($(this),'left') + i($(this),'width') ||
			hero.attr('in-damage') == 'true' ||
			i(hero, 'margin-bottom') > i($(this),'height')-20 ||
			enemies[$(this).attr('type')].attack == 0)
		{ return }

		damage = spread(enemies[$(this).attr('type')].attack,20)

		$('body').append('<div class="hit self">'+prettyNumber(damage,'red')+'</div>')
		hero.attr('in-damage','true')

		player.hp = player.hp-damage
		player.position = player.position-heroDirection*40
		// this is the knockback, should be more than 40 maybe if it's a boss or something

		setTimeout(() => {
			hero.attr('in-damage','false')
			$('.hit.self').remove()
		}, 1000)
	})
}

function enemyDeath(enemy) {
	enemyType = $(enemy).attr('type')
	itemType = enemies[enemyType].item
	amount = 1

	if (enemies[enemyType].gold == 'TRUE' && random(1,2) == 1) {
		itemType = 'gold'
		amount = Math.round(average([enemies[enemyType].hp, enemies[enemyType].attack])/30)
		if (amount < 1) { amount = 1 }
	}

	$('<div class="item"></div>').appendTo('.field').css({
		'left': number(enemy.css('left')),
		'background-image': 'url(assets/item-'+itemType+'.webp)',
		'margin-bottom': i(enemy,'margin-bottom')+'px',
		'z-index': i(enemy,'z-index')
	})
	.attr('type',itemType)
	.attr('amount',amount)
	
	$(enemy).css('left', i(enemy,'left')).addClass('dead').attr('active','false')
	.fadeOut(1000).promise().done(function(enemy) { $(enemy).remove() })

	setTimeout((enemyType, map) => { 
		enemySpawn(enemyType, map)
	}, random(10000,20000), enemyType, player.location)

	if (enemies[enemyType].attack >= 1) {
		player.enemiesSlained[enemyType] = (player.enemiesSlained[enemyType] || 0) + 1
		player.totalEnemiesSlained++
	}
	sound(enemies[enemyType].sound)
	log('Slained '+enemyType, 'slain')
}

function pickUp() {
	if (mode() == 'fight' || mode() == 'jump' || mode() == 'skill' || attackCooldown) return
	$('.field .item').not('.picked').each(function() {
		if (player.position+20 < i($(this),'left') ||
			player.position-20 > i($(this),'left') + i($(this),'width') )
		{ return }

		$(this).addClass('picked')

		if ($(this).attr('type') == 'gold') {
			log('Picked '+$(this).attr('amount')+' gold', 'gold')
		}
		else {
			log('Picked '+$(this).attr('type'), $(this).attr('type'))
		}

		acquireItem($(this).attr('type'), $(this).attr('amount')*1)

		setTimeout(function(item) {
			$(item).remove()
		},400, $(this))
		return false
	});
}

function acquireItem(item, amount = 1) {
	if ( item == 'gold' ) {
		sound('pickup-gold')
	} else {
		sound('pickup-item')
	}

	player.backpack[item] = (player.backpack[item] || 0) + amount;
	setBackpack()
}

function useItem(item) {
	if (equipments.hasOwnProperty(item)) { 
		itemCategory = equipments[item].category
		isEquipped = player.equipments[itemCategory] == item
		player.equipments[itemCategory] = isEquipped ? '' : item;
		sound('heavy-item')
		log((isEquipped ? 'unequipped ' : 'equipped ') + item, item)
	}
	setHero()
	setBackpack()
}

function sellItem(item) {
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

function interact() {
	if (mode() == 'fight' || mode() == 'jump' || mode() == 'skill' || attackCooldown) return

	$('.port.active').each(function() {
		if (player.position < i($(this),'left') ||
			player.position > i($(this),'left') + i($(this),'width'))
		{ return }

		$(this).removeClass('active')
		originMap = player.location
		player.location = $(this).attr('target')
		clearInterval(gameBeat)
		enterMap(originMap)
		closeCard()
		sound('port')
	});

	if ($('.card.left.npc').is(':visible')) {
		closeCard();
		return;
	}

	$('.npc.near-player').each(function() {
		$(this).find('.chat-bubble').addClass('hide')
		npcInteraction($(this).attr('npc-name'))
		sound('click')
	})
	mode('rest');
}

function npcInteraction(npc) {
	$('.card.left, .card.middle').remove()
	card = $('<div class="card left npc"></div>').appendTo('.window')
	.addClass(npcs[npc].type)
	.append($('.person-header').clone())
	.find('.avatar').css('background-image', 'url(assets/avatar-' + npc + '.webp)')
	.end()
	.append('<div class="speech"><div>'+npcs[npc].speech+'</div></div>')
	card.find('h3').html(spcDash(npc))
	card.find('label').html(spcDash(npcs[npc].title))

	showCursor()

	if (npcs[npc].type == 'shop') {
		$('.backpack').show()
		for (item in npcs[npc].items) { 
			createItemRow(npcs[npc].items[item]).appendTo(card)
			.attr('onclick','openBuyMenu("'+npcs[npc].items[item]+'")')
		}
	}

	if (npcs[npc].type == 'sell') {
		$('.backpack').show()
		card.append('<div><div class="tip">Click on an item from your backpack</div></div>')
	}

	if (npcs[npc].type == 'quest') {
		questID = npcs[npc].questID

		if (quests[questID].type == 'achieve') {
			availableAmount = player[quests[questID].requirement]
		}

		if (quests[questID].type == 'collect') {
			availableAmount = player.backpack[quests[questID].requirement] || 0
		}

		questCard = $('<div><div class="quest"><span class="checkbox"></span>'+quests[questID].task+'</div></div>')
		.find('.quest').append('<div class="progress">'+Math.min(availableAmount, quests[questID].amount)+'/'+quests[questID].amount+'</div>').end()
		.appendTo(card)

		if (availableAmount >= quests[questID].amount) {
			questCard.find('.checkbox').addClass('completed')
		}

		if (player.completedQuests.includes(questID)) {
			card.append('<label class="completed">Quest completed</label>')
			return
		}

		card.append('<label class="light">QUEST REWARD</label>')
		for (reward in quests[questID].reward) {
			card.append(createItemRow(reward, quests[questID].reward[reward]))
		}

		if (availableAmount >= quests[questID].amount) {
			card.append('<div class="actions"><div class="button yellow">Complete Quest</div></div>')	
			card.find('.actions .button').attr('onclick','completeQuest("'+questID+'")')
		}
	}
	
	zoom('in');
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
		if ( stat == 'description' && equipments[item][stat] != '' ) {
			stats+='<div class="flex stat"><div class="tip">'+equipments[item][stat]+'</tip></div>'
		}
		else if (stat != 'price' && stat != 'type' && equipments[item][stat] != 0) { 
			stats+='<div class="flex stat"><label>'+stat+'</label><label>'+equipments[item][stat]+'</label></div>'
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

	acquireItem(item)
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

function completeQuest(questID) {
	if (quests[questID].type == 'collect') {
		player.backpack[quests[questID].requirement] -= quests[questID].amount
		log('Delivered '+(quests[questID].amount > 1 ? quests[questID].amount+' ' : '')+quests[questID].requirement, quests[questID].requirement)
	}

	for (reward in quests[questID].reward) {
		amount = quests[questID].reward[reward];
		log('Rewarded '+(amount > 1 ? amount+' ' : '')+reward, reward)
		acquireItem(reward, amount)
	}

	player.completedQuests.push(questID)
	log('Quest completed', 'crown')
	closeCard()
	sound('quest')
}

function setHero() {
    hero = $('.hero').html('');

	if (player.equipments.shield) {
		hero.append('<div style="background-image:url(assets/shield-' + player.equipments.shield + '.webp)" class="equipment"/>')
	}

	if (player.equipments.hat) {
		hero.append('<div style="background-image:url(assets/hat-' + player.equipments.hat + '.webp)" class="equipment"/>')
	}

	if (player.equipments.weapon == '') { player.equipments.weapon = 'none' }

	if ( equipments[player.equipments.weapon].type == 'melee') {
    	hero.append('<div class="weapon" name="'+player.equipments.weapon+'"><img src="assets/weapon-'+player.equipments.weapon+'.webp" /></div>')
	}

	if ( equipments[player.equipments.weapon].type == 'range') {
    	hero.append('<div class="weapon range""></div>')
		hero.find('.weapon').css('background-image','url(assets/weapon-'+player.equipments.weapon+'.webp)')
		.attr('type','range')
	}

	mode('walk') //reset animation
	setTimeout(() => { mode('rest') });
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
                .attr('ondblclick', 'useItem("' + item + '")')
                .attr('onclick', 'sellItem("' + item + '")')
                .css('background-image', 'url(assets/item-' + item + '.webp)');
            if (player.backpack[item] > 1) {
                thumb.html('<span>' + player.backpack[item] + '</span>');
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
			save()
			sound('click')
		}
	});
	for (slot in player.equipments) {
        item = player.equipments[slot]
        if (item && equipments[item]) {
            player.critical += (equipments[item].critical || 0)
        }
    }

	setTooltips();
}

function recover() {
	player.hp = Math.min(player.hp + player.maxHp * 0.001, player.maxHp);
	player.mp = Math.min(player.mp + player.maxMp * 0.003, player.maxMp);

	if (player.hp < 0) { player.hp = 0 }

	$('.bar.hp').find('.value').html(Math.floor(player.hp))
	$('.bar.hp').find('.fill').css('width', player.hp/player.maxHp*100+'%')
	$('.bar.mp').find('.value').html(Math.floor(player.mp))
	$('.bar.mp').find('.fill').css('width', player.mp/player.maxMp*100+'%')
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

	}, function() {
	    $('.card.hover').remove();
	})
}

function monologue(text) {
	if (text == '') { return }
	monologueDiv = $('<div class="monologue chat-bubble"><div class="text"></div></div>');
	$('.window').append(monologueDiv);
	characterIndex = 0;
	function typeWriter() {
		if (characterIndex < text.length) {
			monologueDiv.find('.text').append(text[characterIndex]);
			characterIndex++;
			setTimeout(typeWriter, 25);
		}
	}
	typeWriter();
	setTimeout(function() {
		$('.monologue').remove()
	}, 1000 + 600 * text.split(/\s+/).filter(Boolean).length)
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
	&& !$(e.target).closest('.npc').length
	&& !$(e.target).closest('.button.sell').length
	&& !$(e.target).closest('.backpack').length) {
		closeCard()
	}
	sound('click')
})

function resetPlayer() {
	player = {}
	player.version = 3
	player.speed = 15
	player.backpack = {}
	player.backpack['gold'] = 0
	player.equipments = {}
	player.equipments['weapon'] = 'none'
	player.location = 'a-box'
	player.position = 905
	player.hp = 10
	player.mp = 10
	player.maxHp = 10
	player.maxMp = 10
	player.completedQuests = []
	player.enemiesSlained = {}
	player.totalEnemiesSlained = 0
	player.mapsVisited = []
	player.critical = 20 // 20% base chance to critical
	player.criticalMultiplier = 1.5 // 150% damage
	save()
	location.reload()
}

function sound(sound) {
	let audio = new Audio('sounds/'+sound+'.wav');
	if (sound === 'attack-7') {
		audio.volume = 0.5;
	}
	audio.play();
}

function save() {
	localStorage.setItem('player', JSON.stringify(player))
}

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

function hideCursor() {
    $('*').css('cursor', 'none');
}
function showCursor() {
    $('*').css('cursor', 'url(assets/cursor.svg), auto');
}
$(document).on('mousemove', showCursor);

function i(element, param) {
   	el = $(element)
    if (el.length === 0) return
    value = el.css(param)
    return value ? number(value) : 0
}

function number(input) {
    if (typeof input !== 'string') {
        console.warn(`Expected string, got ${typeof input}`);
        return 0; // or some default value
    }
    return Math.round(parseFloat(input));
}

function mode(mode) {
	if ( mode != null ) { 
		hero.attr('mode',mode)
		hero.find('.equipment').attr('mode',mode) 
	}
	modeDurations = {
		walk: (80 - player.speed) * 4 + 'ms',
		rest: '2000ms',
		jump: '800ms',
		fight: '400ms'
	};
	if (modeDurations[mode]) {
		$(`[mode=${mode}]`).css('animation-duration', modeDurations[mode]);
		$(`[mode=${mode}] *`).css('animation-duration', modeDurations[mode]);
		if (mode === 'rest') {
			hero.find('.weapon').css('animation-duration', '400ms');
		}
	}
	return hero.attr('mode')
}

function prettyNumber(number, color) {
	number = number.toString().split('')
	images = ''
	for ( digit in number ) {
		images+='<img number="'+number[digit]+'" src="assets/number-'+number[digit]+'-'+color+'.webp" />'
	}
	return images
}

function pop(element){
	setTimeout(function() {
		$(element).css({
			'transition': 'all 400ms',
			'transform': 'scale(1.5)',
			'z-index':'1000'
		})
	},300)
	setTimeout(function() {
		$(element).css('transform','scale(1)')
		$(element).css('filter','brightness(150%)')
	},700)
	setTimeout(function() {
		$(element).css('filter','none')
	},1000)
}

function shake(element) {
	$(element).css('transform','scaleY(1.01) translateY(4px)')
	setTimeout(()=> {
		$(element).css('transform','scaleY(1.005) translateY(-2px)')
	},100)
	setTimeout(()=> {
		$(element).css('transform','none')
	},200)
}

function teleport(location) {
	player.location = location
	player.position = 630
	clearInterval(gameBeat)
	enterMap()
}

function showRange(x1,x2) {
	range = $('<div class="range" style="position:absolute; bottom:330px; z-index:100; background:red; opacity:0.3; height:40px"></div>')
	range.css('width', Math.abs(x2-x1))
	range.css('left', x1)
	$('.field').append(range)
	setTimeout(function(range) { $(range).remove() }, 1000, range)
}

function pose(atkType) {
	mode('fight')
	hero.attr('atkType',atkType)
	$('.hero, .weapon').css('animation-duration','4000ms')
	$('.weapon').css('animation-name','weapon-'+atkType)
}

function spcDash(string) {
	return string.replaceAll('-',' ')
}

function average(arr) {
    return arr.reduce((sum, value) => sum + value, 0) / arr.length;
}

function sign(number) {
	return Math.sign(number)
}

function abs(number) {
	return Math.abs(number)
}

function round(number) {
	return Math.round(number)
}

function random(min,max) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}

function spread(number, spread) {
	spread = random(100-spread, 100+spread)
  return Math.round(number * (spread/100))
}