fetch('https://galshir.com/php/wor.php')
.then(res => res.json())
.then(data => {
  gameData = data;
  initGame()
})

function initGame() {
	player = JSON.parse(localStorage.getItem('player'))

	if (!player) { resetPlayer() }

	mapBuffer = 400

	maps = gameData['maps']
	enemies = gameData['enemies']
	equipments = gameData['equipments']
	skills = gameData['skills']
	npcs = gameData['npcs']

	keyState = {left: false, right: false};
	heroDirection = 1
	attackCooldown = false;
	skillCooldown = false;

	document.onkeydown = (e) => {
		switch(e.keyCode) {
			case 39: keyState.right = true; break;
			case 37: keyState.left = true; break;
			case 32: jump(); break;
			case 65: if (!attackCooldown) fight(); break;
			case 83: if (!skillCooldown) useSkill('s'); break;
			case 68: if (!skillCooldown) useSkill('d'); break;
			case 90: pickUp(); break;
			case 38: usePort(); break;
			case 66: $('.card.backpack').toggle(); break;
			case 27: $('.x').click(); $('.card.backpack').hide(); break;
		}
	}
	
	document.onkeyup = (e) => {
		switch(e.keyCode) { 
			case 39: keyState.right = false; break;
			case 37: keyState.left = false; break;
		}
		if (!keyState.left && !keyState.right) {
			$('[mode=walk]').attr('mode','rest');
		}
	}

	setInterval(() => { 
		walk(keyState)
		collide()
		recover()
		save()
	},100)

	setHeroAndBackpack()
	enterMap()
}

function walk(keyState) {
	if (mode() == 'fight' || skillCooldown) return

	isWalking = keyState.left || keyState.right
	change = 0

	if (keyState.right) change = player.speed
	if (keyState.left) change = -player.speed

	if (isWalking) { 
		hero.css('transform', 'scaleX(' + sign(change) + ')').attr('direction', sign(change))
		heroDirection = sign(change)
		if (mode() !== 'jump') { 
			mode('walk')
		}
		if (player.position + change >= 600 && 
			player.position + change <= i('.map','width') - 600) { 
			player.position += change
		}
	} else if (mode() != 'jump') {
		mode('rest')
	}

	if ( player.position < 600 ) {
		player.position = 700
	}
	if ( player.position > i('.map','width') - 600 ) {
		player.position = i('.map','width') - 700
	}
	slideMap()
}

function slideMap() {
	windowWidth = i('.window','width')
	$('.field').css('left', windowWidth/2-player.position)
	$('.sky').css('left', -(windowWidth/2-player.position) / -(i('.map','width')-windowWidth) * (i('.sky','width')-windowWidth))
}

function enterMap(origin) {
	$('.overlay').css('opacity',1)

	setTimeout(function() {

		$('.field').html('')
		$('.field').append('<img class="map" src="assets/map-'+player.location+'.png" />')
		$('.sky').attr('src','assets/map-'+player.location+'-sky.png')

		isMapLoaded = setInterval(() => {
			if ( i('.map','width') < 1 ) { return }
			clearInterval(isMapLoaded)

			for (type in maps[player.location].enemies) {
				Array.from({length: maps[player.location].enemies[type]}, () => enemySpawn(type, player.location));
			}

			for (port in maps[player.location].ports) {
				if ( maps[player.location].ports[port] == '' ) break 
				portObject = $("<div class='port'></div>")
				.addClass(port)
				.attr('target',maps[player.location].ports[port])
				.appendTo('.field')
			}

			for (npc in maps[player.location].npc) {
				npc = $("<div class='npc'></div>")
				.css('left',maps[player.location].npc[npc])
				.css('background-image','url(assets/npc-'+npc+'.png)')
				.css({
					'background-size': npcs[npc].size*3+'px',
					'width': npcs[npc].size,
					'height': npcs[npc].size
				})
				.attr('onclick','npcClick("'+npc+'")')
				.html('<span>'+spcDash(npc)+'</span>')
				.appendTo('.field')
			}

			if (origin) {
				originSide = Object.entries(maps[player.location].ports).find(([originSide, name]) => name === origin)?.[0]
				if ( originSide == 'left' ) {
					player.position = 624
					hero.css('transform','scaleX(1)')
				}
				if ( originSide == 'right' ) {
					player.position = i('.map','width')-624
					hero.css('transform','scaleX(-1)')
				}
				if ( originSide == 'middle' ) {
					player.position = i('.map','width')/2
				}
			}

			setTimeout(function() {
				$('.overlay').css('opacity',0)
				$('.mapsign').remove()
				$('.window').append('<div class="mapsign"><span></span><span>'+spcDash(player.location)+'</span><span></span></div>')
			},mapBuffer)
		}, 50)

	}, mapBuffer)
}

function jump() {
	if (mode() == 'fight' || mode() == 'jump' || skillCooldown) return
	mode('jump')
	sound('jump')
	hero.addClass('jumping')
	setTimeout(() => { hero.removeClass('jumping') },300)
	setTimeout(() => { mode('rest'); sound('land') },590)
}

function fight(atkType = random(1,5), rangeStart = 0, rangeEnd = 0, atkMultiplier=1, maxTargets=1) {
    if (mode() == 'fight' || mode() == 'jump' || attackCooldown) return
    attackCooldown = true;
    mode('fight')

    hero.attr('atkType',atkType)
    $('.weapon').css('animation-name','weapon-'+atkType)
    sound('attack-'+atkType)

    x1 = player.position+rangeStart
    x2 = player.position+rangeEnd+i('.weapon','height')

    if (heroDirection == -1) { 
        x1 = player.position-i('.weapon','height')-rangeEnd
        x2 = player.position-rangeStart
    }

    // showRange(x1,x2)

    setTimeout(()=> {  
        enemiesAttacked = 0
        $('.enemy[active=true]').each(function() {
            if ( x1 > i($(this),'left')+i($(this),'width') || x2 < i($(this),'left') ) return

			attack = 1 // hitting with bare hands if there is no weapon equipped
			if (equipments[player.equipments.weapon]) {
            	attack = spread(equipments[player.equipments.weapon].attack*atkMultiplier,20)
			}

            $(this).css('animation-name', 'enemy-hit')
            .attr('angry','true')
            .attr('hp', $(this).attr('hp')-attack)
            .find('.bar').css('width', $(this).attr('hp')/enemies[$(this).attr('type')].hp*100+'%')
        
            hit = $('<div class="hit">'+prettyNumber(attack,'yellow')+'</div>').css('left', i($(this),'left')).appendTo('.field')
            setTimeout((hit)=> { hit.remove() },800, hit)

            if ( $(this).attr('hp') <= 0 ) { enemyDeath($(this)) } 
            else { setTimeout(() => {$('.enemy').css('animation-name', 'ping-pong')}, 200) }
        
            setTimeout(function() {
                sound('hit-'+random(1,3)) 
            },enemiesAttacked*50)

            if (++enemiesAttacked == maxTargets) return false
        });
    },200)

    setTimeout(() => { 
        mode('rest')
        $('.weapon').css('animation-name','')
        attackCooldown = false;
    },390)
}

function useSkill(key) {
    if (mode() == 'fight' || mode() == 'jump' || skillCooldown) { return }

    //based on the weapon data:
    if (key == 's') { skill = 'surge'  }
    if (key == 'd') { skill = 'impact' }

    mpCost = (equipments[player.equipments.weapon].attack*skills[skill].atkMultiplier)/2
    if (player.mp < mpCost) { shake($('.bar.mp')); return }
    player.mp = player.mp-mpCost
    
    skillCooldown = true;

    skillSprite = $('<div class="skill"></div>').css({
        'transform' :'scaleX('+heroDirection+')',
        'background-image': 'url(assets/skill-'+skill+'.png)'
    })

    if (skill == 'surge') {
        fight(atkType=1, rangeStart=0,rangeEnd=120, skills[skill].atkMultiplier, maxTargets=2)
        sound('swoosh')
        hero.after(skillSprite)
        player.position = player.position+heroDirection*100
        slideMap()
    }

    if (skill == 'impact') {
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

	destination = random(800, i('.field .map','width')-800 )
	yOffset = random(-6,6)

	enemy = $('<div class="enemy" type="'+type+'"><div class="hpBar"><div class="bar"></div></div></div>')
	.css({
		'background-image': 'url(assets/enemy-'+type+'.png)',
		'left': destination,
		'width': enemies[type].size[0],
		'height': enemies[type].size[1],
		'display':'none'
	})
	.attr('hp',enemies[type].hp)
	.appendTo('.field')

	$(enemy).fadeIn(1000).promise().done(function(enemy) {
		enemy.attr('active','true')
	})

	enemyMove(enemy)
}

function enemyMove(enemy) {
	if (enemies[enemy.attr('type')].speed == 0 || $(enemy).attr('active') == 'false') { return }

	attempts = 0
	while (attempts < 100 ) {
	    distance = random(-200, 200);
	    if (i(enemy, 'left') + distance >= 600 && 
	        i(enemy, 'left') + distance <= i('.field .map', 'width') - 600) {
	        break;
	    }
	    attempts++;
	}

	speed = spread(enemies[enemy.attr('type')].speed,20)

	if ( enemy.attr('angry') == 'true' ) {
		distance = player.position - i(enemy,'left')-i(enemy,'width')/2 + random(-100,100)
		speed = speed/1.2
	}

	enemy.css({
		'left': i(enemy,'left')+distance,
		'transform': 'scaleX('+sign(distance)+')',
		'transition-duration': abs(distance)*speed+'ms',
		'animation-duration': speed*20+'ms'
	})
	.find('.hpBar').css('transform','scaleX('+sign(distance)+')')

	setTimeout(function(enemy) {
		enemyMove(enemy)
	}, abs(distance)*speed, enemy)
}

function collide() {
	$('.enemy[active=true]').each(function() {
		if (player.position < i($(this),'left') ||
			player.position > i($(this),'left') + i($(this),'width') ||
			hero.attr('in-damage') == 'true' ||
			i(hero, 'margin-bottom') > i($(this),'height')-20 ||
			enemies[$(this).attr('type')].attack == 0)
		{ return }

		attack = spread(enemies[$(this).attr('type')].attack,20)

		$('body').append('<div class="hit self">'+prettyNumber(attack,'red')+'</div>')
		hero.attr('in-damage','true')

		player.hp = player.hp-attack

		setTimeout(() => {
			hero.attr('in-damage','false')
			$('.hit.self').remove()
		}, 1000)
	})
}

function enemyDeath(enemy) {
	enemyType = $(enemy).attr('type')
	itemType = enemies[enemyType].item
	
	if (enemies[enemyType].gold == 'TRUE') {
		if (random(1,2) == 1) {
			itemType = 'gold'
		}
		// if (player.mp < player.maxMp/2 && random(1,10) == 1) {
		// 	itemType = 'mana-bless'
		// }
		// if (player.hp < player.maxHp/2 && random(1,10) == 1) {
		// 	itemType = 'health-bless'
		// }
	}

	item = $('<div class="item"></div>').appendTo('.field').css({
		'left': number(enemy.css('left')),
		'background-image': 'url(assets/item-'+itemType+'.png)'
	})
	.attr('type',itemType)
	.attr('gold-amount',Math.round(average([enemies[enemyType].hp, enemies[enemyType].attack])/3))

	$(enemy).css({
		'left': i(enemy,'left')
	}).addClass('dead')
	.attr('active','false')

	$(enemy).fadeOut(1000).promise().done(function(enemy) { $(enemy).remove() })

	setTimeout((enemyType, map) => { 
		enemySpawn(enemyType, map)
	}, random(10000,20000), enemyType, player.location)

	sound(enemies[enemyType].sound)
}

function pickUp() {
	$('.field .item').not('.picked').each(function() {
		if (player.position+20 < i($(this),'left') ||
			player.position-20 > i($(this),'left') + i($(this),'width') )
		{ return }

		$(this).addClass('picked')
		acquireItem($(this).attr('type'))

		setTimeout(function(item) {
			$(item).remove()
		},400, $(this))
		return false
	});
}

function acquireItem(item) {
	if ( item == 'gold' ) {
		sound('pickup-gold')
	} else {
		sound('pickup-item')
	}

	if (item == 'health-bless') {
		player.hp += player.maxHp*0.3
		sound('bless')
		return
	}

	if (item == 'mana-bless') {
		player.mp += player.maxMp*0.3
		sound('bless')
		return
	}

	player.backpack[item] = (player.backpack[item] || 0) + 1;
	setHeroAndBackpack()
}

function useItem(item) {
	if (equipments.hasOwnProperty(item)) { 
		itemType = equipments[item].type
		player.equipments[itemType] = (player.equipments[itemType] == item) ? '' : item;
		sound('heavy-item')
	}
	setHeroAndBackpack()
	sound('click')
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
	.append('<div class="actions"><div class="button yellow">SELL</div></div>')

	$('.npc.sell input').on('input',function() {
		if ($(this).val() > player.backpack[item] || $(this).val() < 1) {
			$(this).val(player.backpack[item])
		}
		amount = $(this).val()
		$('.npc.sell .sell-price label').html(amount*calcItemPrice(item))
	})

	$('.npc.sell .actions .button').click(function() {
		player.backpack[item] = player.backpack[item]-amount

		for (type in player.equipments) {
			if (player.equipments[type] == item && player.backpack[item] < 1) {
				player.equipments[type] = ''
			}
		}

		player.backpack.gold += amount*calcItemPrice(item)
		sound('pickup-gold')
		setHeroAndBackpack()

		$('.npc.sell .speech ~ *').remove()
		$('.npc.sell .speech div').html("Deal done. Great doing business with you! Anything else you'd like to sell?")
	})

	sound('click')
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

function usePort() {
	$('.port').each(function() {
		if (player.position < i($(this),'left') ||
			player.position > i($(this),'left') + i($(this),'width'))
		{ return }

		origin = player.location
		player.location = $(this).attr('target')
		enterMap(origin)
		$('.x').click(); $('.card.backpack').hide();
		sound('port')
	});
}

function npcClick(npc) {
	$('.card.left, .card.middle').remove()
	card = $('<div class="card left npc"></div>').appendTo('.window')
	.addClass(npcs[npc].type)
	.append($('.person-header').clone())
	.append('<div class="button x round" onclick="closeCard(this)"></div>')
	.append('<div class="speech"><div>'+npcs[npc].speech+'</div></div>')
	card.find('h3').html(spcDash(npc))
	card.find('label').html(npcs[npc].title)

	for (item in npcs[npc].items) { 
		createItemRow(npcs[npc].items[item]).appendTo(card)
		.attr('onclick','openBuyMenu("'+npcs[npc].items[item]+'")')
	}

	if (npcs[npc].type == 'sell') {
		$('.backpack').show()
		card.append('<div><div class="tip">Click on an item from your backpack</div></div>')
	}
	sound('click')
}

function openBuyMenu(item) {
	$('.card.middle').remove()
	card = $('<div class="card middle buy"></div>').appendTo('.window')
	.append(createItemRow(item))
	.append(itemStats(item))

	card.append('<label>PRICE:</label>')

	actions = $('<div class="actions"><div class="button yellow">buy</div></div>')
	actions.find('.button').attr('onclick','buy("'+item+'")')

	for (requiredItem in equipments[item].price) {
		amountRequired = equipments[item].price[requiredItem]
		amountAvailable = player.backpack[requiredItem]
		if (amountAvailable == undefined) {
			amountAvailable = 0
		}

		itemRow = createItemRow(requiredItem,amountRequired).appendTo(card)

		if (amountAvailable < amountRequired ) {
			itemRow.css('opacity','0.4')
			actions.find('.button').addClass('disabled').attr('onclick','')
		}
	}

	card.append(actions)
	sound('click')
}

function itemStats(item) {
	stats = ''
	for (stat in equipments[item]) {
		if ( stat == 'description' && equipments[item][stat] != '' ) {
			stats+='<div class="flex stat"><div class="tip">'+equipments[item][stat]+'</tip></div>'
		}
		else if (stat != 'price' && equipments[item][stat] != 0) { 
			stats+='<div class="flex stat"><label>'+stat+':</label><label>'+equipments[item][stat]+'</label></div>'
		}
	}
	return stats
}

function buy(item) {
	for (requiredItem in equipments[item].price) {
		amountRequired = equipments[item].price[requiredItem]
		player.backpack[requiredItem] = player.backpack[requiredItem]-amountRequired
	}

	acquireItem(item)
	setHeroAndBackpack()
	openBuyMenu(item)
	$('.card.backpack').show()
	pop($('.card.backpack').find('[type='+item+']'))
	sound('heavy-item')
}

function createItemRow(item, amount) {
	itemRow = $('<div class="item-row flex"></div>')
	itemThumb = $('<div class="thumb"></div>')
	.css('background-image','url(assets/item-'+item+'.png')
	.appendTo(itemRow)
    itemLabel = (amount != undefined) ? amount+' '+spcDash(item) : spcDash(item);
		itemRow.append('<label>'+itemLabel+'</label>')
    return itemRow
}

function setHeroAndBackpack() {
    hero = $('.hero').html('');

	if (player.equipments.shield ) {
		hero.append('<div style="background-image:url(assets/shield-' + player.equipments.shield + '.png)" class="equipment"/>');
	}

	if (player.equipments.hat ) {
		hero.append('<div style="background-image:url(assets/hat-' + player.equipments.hat + '.png)" class="equipment"/>');
	}

	if (player.equipments.weapon == '') { player.equipments.weapon = 'none' }
    hero.append('<img src="assets/weapon-' + (player.equipments.weapon || 'none') + '.png" class="weapon" />');

	$('.bar.gold .value').html(player.backpack.gold);

    $('.backpack .thumb').remove();
    for (item in player.backpack) {
        if (player.backpack[item] >= 1) {
            let thumb = $('<div class="thumb tooltip"></div>').appendTo('.backpack .grid')
                .attr('type', item)
                .attr('ondblclick', 'useItem("' + item + '")')
                .attr('onclick', 'sellItem("' + item + '")')
                .css('background-image', 'url(assets/item-' + item + '.png)');
            if (player.backpack[item] > 1) {
                thumb.html('<span>' + player.backpack[item] + '</span>');
            }
        } else if (item != 'gold') {
            delete player.backpack[item];
        }
    }
    for (type in player.equipments) {
        if (player.equipments[type]) {
            $('.backpack').find('[type=' + player.equipments[type] + ']').addClass('equiped');
        }
    }
	
	mode('walk') //reset rest animation
	setTimeout(() => { mode('rest') });
    setTooltips();
}

function recover() {
	player.hp = Math.min(player.hp + player.maxHp * 0.001, player.maxHp);
	player.mp = Math.min(player.mp + player.maxMp * 0.002, player.maxMp);

	if (player.hp < 0) { player.hp = 0 }

	$('.bar.hp').find('.value').html(Math.floor(player.hp)+'/'+player.maxHp)
	$('.bar.hp').find('.fill').css('width', player.hp/player.maxHp*100+'%')
	$('.bar.mp').find('.value').html(Math.floor(player.mp)+'/'+player.maxMp)
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

function closeCard(element) {
	$(element).parents('.card').remove()
	$('.card.middle').remove()
	$('.card.backpack').hide()
}

function resetPlayer() {
	player = {}
	player.speed = 20
	player.backpack = {}
	player.backpack['gold'] = 0
	player.equipments = {}
	player.equipments['weapon'] = 'none'
	player.location = 'rookie-camp'
	player.position = 600
	player.hp = 10
	player.mp = 10
	player.maxHp = 10
	player.maxMp = 10
	save()
	location.reload()
}

function teleport(location) {
	player.location = location
	enterMap(player.location)
}

function sound(sound) {
	new Audio('sounds/'+sound+'.wav').play()
}

function save() {
	localStorage.setItem('player', JSON.stringify(player))
}

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
	return hero.attr('mode')
}

function prettyNumber(number, color) {
	number = number.toString().split('')
	images = ''
	for ( digit in number ) {
		images+='<img number="'+number[digit]+'" src="assets/number-'+number[digit]+'-'+color+'.png" />'
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
	$(element).css('transform','translateY(4px)')
	setTimeout(()=> {
		$(element).css('transform','translateY(-2px)')
	},100)
	setTimeout(()=> {
		$(element).css('transform','none')
	},200)
}

function showRange(x1,x2) {
	range = $('<div class="range" style="position:absolute; top:390px; z-index:100; background:red; opacity:0.3; height:40px"></div>')
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