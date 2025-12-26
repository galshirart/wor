

function enemySpawn(type,map) {
	if (map != player.location) { return }

	destination = random(800, i('.map','width')-800)
	yOffset = random(-5,5)

	enemy = $('<div class="enemy" type="'+type+'"><div class="image"></div><div class="hpBar"><div class="bar"></div></div></div>').appendTo('.field')
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


function enemyDeath(enemy) {
	enemyType = $(enemy).attr('type')

	if (enemies[enemyType].item) {
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
	}
	
	$(enemy).css('left', i(enemy,'left')).addClass('dead').attr('active','false')
	.fadeOut(1000).promise().done(function(enemy) { $(enemy).remove() })

	setTimeout((enemyType, map) => { 
		enemySpawn(enemyType, map)
	}, random(10000,20000), enemyType, player.location)

	player.enemiesSlained[enemyType] = (player.enemiesSlained[enemyType] || 0) + 1

	sound(enemies[enemyType].sound)
	log('Slained '+enemyType, 'slain')
}