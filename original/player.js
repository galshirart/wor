function jump() {
	if (mode() == 'fight' || mode() == 'jump' || skillCooldown) return
	mode('jump')
	hero.addClass('jumping')
	setTimeout(() => hero.removeClass('jumping'), 400);
	setTimeout(() => { mode('rest'); sound('land') }, 790);
	sound('jump')
}

function projectileMove() {
	$('.projectile').each(function() {
		projectleElement = $(this)
		x1 = i(projectleElement, 'left')
		x2 = x1 + i(projectleElement, 'width')
		projectileSpeed = projectleElement.attr('speed');

		projectleElement.css('left', x1 + projectleElement.attr('direction')*projectileSpeed+'px')
		if (Math.abs(x1 - projectleElement.attr('originX')) > projectleElement.attr('range')) {
			projectleElement.remove()
		}

		$('.enemy[active=true][hitable=TRUE]').each(function() {
			if ( x1 > i($(this),'left')+i($(this),'width') || x2 < i($(this),'left') ) return
			hit($(this), projectleElement.attr('attack'))
			projectleElement.remove()
			return false
		})
	})
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

		acquire($(this).attr('type'), $(this).attr('amount')*1)

		setTimeout(function(item) {
			$(item).remove()
		},400, $(this))
		return false
	});
}

function acquire(item, amount = 1) {
	if ( item == 'gold' ) {
		sound('pickup-gold')
	} else {
		sound('pickup-item')
	}

	player.backpack[item] = (player.backpack[item] || 0) + amount;
	setBackpack()
	setConsumables()
}

function equip(item) {
	if (equipments.hasOwnProperty(item)) { 
		itemCategory = equipments[item].category
		isEquipped = player.equipments[itemCategory] == item
		player.equipments[itemCategory] = isEquipped ? '' : item;
		sound('heavy-item')
		log((isEquipped ? 'unequipped ' : 'equipped ') + item, item)
		setHero()
	}
	for (equipment in player.equipments) {
		if (player.equipments[equipment] == "") {
			delete player.equipments[equipment];
		}
	}
	setBackpack()
	setStats()
}

function consume(item) {
	item = $('.consumables .icon:nth-child(' + item + ')').attr('type');
	if (!item) { return }

	// check if the item is already active
	if (activeConsumables.includes(item)) { 
		shake($('.consumables'));
		return 
	}

	// check if the same effect is already active
	for (activeItem in activeConsumables) {
		if (consumables[activeConsumables[activeItem]].effect == consumables[item].effect) {
			activeConsumables.splice(activeConsumables.indexOf(activeItem), 1);
		}
	}

	if (consumables[item].effect == 'hp recover') {
		if (player.hp == player.maxHp) {
			shake($('.bar.hp').parent('.bar-container'));
			return 
		}
		player.hp += Number(consumables[item].value)
	}
	if (consumables[item].effect == 'mp recover') {
		if (player.mp == player.maxMp) {
			shake($('.bar.mp').parent('.bar-container'));
			return 
		}
		player.mp = Math.min(player.mp + consumables[item].value, player.maxMp);
	}

	if (consumables[item].duration > 0) {
		activeConsumables.push(item);
		setStats()
		setTimeout(() => {
			activeConsumables.splice(activeConsumables.indexOf(item), 1);
			$('.consumables .icon[type='+item+']').removeClass('active');
			setStats()
			setConsumables()
		}, consumables[item].duration*60000);
	}
	
	log(consumables[item].effect+' +'+consumables[item].value, item)

	player.backpack[item] = player.backpack[item] - 1;
	setBackpack()
	setConsumables()
	sound('bless')
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

	if (equipments[player.equipments.weapon].type == 'melee') {
    	hero.append('<div class="weapon" name="'+player.equipments.weapon+'"><img src="assets/weapon-'+player.equipments.weapon+'.webp" /></div>')
	}

	if (equipments[player.equipments.weapon].type == 'range') {
    	hero.append('<div class="weapon range""></div>')
		hero.find('.weapon').css('background-image','url(assets/weapon-'+player.equipments.weapon+'.webp)')
		.attr('type','range')
	}

	mode('walk') //reset animation
	setTimeout(() => { mode('rest') });
}

function recover() {
	player.hp = Math.min(player.hp + player.maxHp * 0.0001, player.maxHp);
	player.mp = Math.min(player.mp + player.maxMp * 0.0003, player.maxMp);

	if (player.hp < 0) { player.hp = 0 }

	$('.bar.hp').find('.value').html(Math.floor(player.hp))
	$('.bar.hp').find('.fill').css('width', player.hp/player.maxHp*100+'%')
	$('.bar.mp').find('.value').html(Math.floor(player.mp))
	$('.bar.mp').find('.fill').css('width', player.mp/player.maxMp*100+'%')
}

function resetPlayer() {
	player = {}
	player.version = latestVersion
	player.backpack = { gold: 0 }
	player.equipments = { weapon: 'none' }
	player.location = 'a-box'
	player.position = 905
	player.hp = 10
	player.mp = 10
	player.maxHp = 10
	player.maxMp = 10
	player.questsCompleted = []
	player.questsAccepted = []
	player.enemiesSlained = {}
	player.mapsVisited = []
	player.criticalMultiplier = 1.5 // 150% damage
	save()
	location.reload()
}

function setStats() {
	// base stats
	totalWalkSpeed = 1.5;
	totalCritical = 10;
	totalAtkSpeed = 800 - equipments[player.equipments.weapon].attackSpeed*50;

	// equipment bonuses
	for (slot in player.equipments) {
		item = player.equipments[slot]
		if (item && equipments[item]) {
			totalCritical += Number(equipments[item].critical || 0)
		}
	}

	// consumable bonuses
	activeConsumables.forEach(item => {
		if (consumables[item].effect == 'walk speed') {
			totalWalkSpeed += totalWalkSpeed * Number(consumables[item].value.replace('%', '')/100);
		}
		if (consumables[item].effect == 'attack speed') {
			totalAtkSpeed = totalAtkSpeed * (1 - Number(consumables[item].value.replace('%', ''))/100);
		}
		if (consumables[item].effect == 'critical') {
			totalCritical += Number(consumables[item].value.replace('%', ''))
		}
	})

	// minimums
	if (totalAtkSpeed < 200) { totalAtkSpeed = 200 }
}

function mode(mode) {
	if ( mode != null ) { 
		hero.attr('mode',mode)
		hero.find('.equipment').attr('mode',mode) 
	}
	modeDurations = {
		walk: 400/totalWalkSpeed + 'ms',
		rest: '2000ms',
		jump: '800ms',
		fight: totalAtkSpeed+'ms'
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
