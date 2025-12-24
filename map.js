function enterMap(originMap) {
    $('.overlay').css('opacity', 1);

	imagesToLoad = [];
	imagesToLoad.push(`assets/map-${player.location}.webp`);
	if (maps[player.location].layers.includes('front')) imagesToLoad.push(`assets/map-${player.location}-front.webp`);
	if (maps[player.location].layers.includes('back')) imagesToLoad.push(`assets/map-${player.location}-back.webp`);

	Object.keys(maps[player.location].enemies).forEach(type => {
		imagesToLoad.push(`assets/enemy-${type}.webp`);
		if (enemies[type].item) {
			imagesToLoad.push(`assets/item-${enemies[type].item}.webp`);
		}
	});
	Object.keys(maps[player.location].npc).forEach(npc => {
		imagesToLoad.push(`assets/npc-${npcs[npc].name}.webp`, `assets/avatar-${npcs[npc].name}.webp`);
	});

	setTimeout(() => {
		$('.back, .front').remove();
		$('.field').html(`<img class="map" src="assets/map-${player.location}.webp" />`);
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
			Object.keys(maps[player.location].npc || {}).forEach(placeNPC);

			placePorts()
		
			if (!player.mapsVisited.includes(player.location)) {
				player.mapsVisited.push(player.location);
			}

			if (['a-box', 'box-shore'].includes(player.location)) {
				setTutorial()
			} else {
				$('.tutorial').remove()
			}
		}, 150);

		setTimeout(() => {
			gameBeat = setInterval(() => {
				walk(keyState);
				slideMap();
				collide();
				projectileMove();
				recover();
				save();
			}, 10);

			$('.overlay').css('opacity', 0);
			$('.mapsign').remove();
			$('.window').append(`<div class="mapsign"><span></span><span>${spcDash(player.location)}</span><span></span></div>`);
			updateMetaTitle();
		}, 250);
	});
}


function walk(keyState) {
	if (mode() === 'fight' || skillCooldown) return;
	isWalking = false

	let change = 0;
	if (keyState.right) change = totalWalkSpeed;
	else if (keyState.left) change = -totalWalkSpeed;

	if (change) {
		isWalking = true;
		heroDirection = Math.sign(change);
		hero.css('transform', 'scaleX(' + heroDirection + ')').attr('direction', heroDirection);
		if (mode() !== 'jump') mode('walk');
		player.position += change;
		hideCursor();
	} else if (mode() !== 'jump') {
		mode('rest');
	}

	if (player.position < 610) player.position = 610;
	if (player.position > mapWidth - 610) player.position = mapWidth - 610;

	$('.field .npc').each(function() {
		near = player.position >= i(this, 'left') - 60 && player.position <= i(this, 'left') + i(this, 'width') + 60;
		$(this).toggleClass('near-player', near);
	});

	if ($('.field .npc.near-player').length === 0) {
		closeCard('npc');
	}
}

function slideMap() {
	offset = (i('.window', 'width') / 2) - player.position;
	$('.field').css('left', `${offset}px`);
	parallaxRatio = (mapWidth - i('.window', 'width')) > 0 ? (offset / (mapWidth - i('.window', 'width'))) : 0;
	$('.back').css('left', `${parallaxRatio * (backWidth - i('.window', 'width'))}px`);
	$('.front').css('left', `${parallaxRatio * (frontWidth - i('.window', 'width'))}px`);
}

function placePorts() {
	$('.port, .lock-icon, .sparkles').remove()

	Object.keys(maps[player.location].ports || {}).forEach(function(port) {
		portX = 590 + (i('.map','width') - 1270) * maps[player.location].ports[port] / 100
		portElement = $("<div class='port'></div>").css('left', portX).attr('target',port).appendTo('.field')
	
		for (condition in maps[port].conditions) {
			if ( condition == 'questAccepted' && !player.questsAccepted.includes(maps[port].conditions[condition]) ) {
				portElement.addClass('locked');
				$('<img src="assets/item-lock.webp" class="lock-icon" />').css('left', portX).appendTo('.field');
			}
			if ( condition == 'questCompleted' && !player.questsCompleted.includes(maps[port].conditions[condition]) ) {
				portElement.addClass('locked');
				$('<img src="assets/item-lock.webp" class="lock-icon" />').css('left', portX).appendTo('.field');
			}
		}
	
		$("<div class='sparkles'></div>").css('left', portX).appendTo('.field')
	});

	setTimeout(() => { $('.port:not(.locked)').addClass('active'); }, 400);
}

function placeNPC(npc) {		
	npcElement = $("<div class='npc'><div class='image'></div></div>").appendTo('.field')
	.css('left', (i('.map','width') - 1200) * maps[player.location].npc[npc][0] / 100 + 600 - npcs[npc].size[0] / 2)
	.css('margin-bottom', maps[player.location].npc[npc][1]+'px')
	.attr({
		'quest': npcs[npc].quest,
		'npc-name': npc
	})
	.append('<div class="chat-bubble dots"></div>')
	.find('.image')
	.css({
		'background-image': 'url(assets/npc-' + npcs[npc].name + '.webp)',
		'background-size': npcs[npc].size[0] * 5 + 'px',
		'width': npcs[npc].size[0],
		'height': npcs[npc].size[1]
	})
}



function setTutorial() {
	if (tutorialInterval) return;
	tutorialInterval = setInterval(() => {
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

function interact() {
	if (mode() == 'fight' || mode() == 'jump' || mode() == 'skill' || attackCooldown) return

	$('.port.active').not('.locked').each(function() {
		if (player.position < i($(this),'left') ||
			player.position > i($(this),'left') + i($(this),'width'))
		{ return }

		$(this).removeClass('active')
		originMap = player.location
		player.location = $(this).attr('target')
		clearInterval(gameBeat);
		enterMap(originMap)
		closeCard()
		sound('port')
	});

	if (!$('.card.left.npc').is(':visible') && $('.npc.near-player').length > 0) {
		$('.npc.near-player').find('.chat-bubble').addClass('hide')
		npcInteraction($('.npc.near-player').attr('npc-name'))
		sound('click')
	}


	mode('rest');
}

function teleport(location) {
	player.location = location
	player.position = 630
	clearInterval(gameBeat)
	enterMap()
}


