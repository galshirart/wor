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

		setTimeout(() => { sound('attack') }, totalAtkSpeed/4)

		setTimeout(() => {
			$('.enemy[active=true][hitable=TRUE]').each(function() {
				if ( x1 > i($(this),'left')+i($(this),'width') || x2 < i($(this),'left') ) return
				hit($(this), equipments[player.equipments.weapon].attack*atkMultiplier)
				return false
			})
		}, totalAtkSpeed/2)
	}

	if (equipments[player.equipments.weapon].type == 'range') {
		atkType = 6

		setTimeout(() => { sound('bow') }, totalAtkSpeed/4)

		setTimeout(() => {
			$('<div class="projectile"></div>').appendTo('.field')
			.css({
				'transform': 'scaleX('+heroDirection+')',
				'left': player.position+heroDirection*40-40,
				'width': 80
			})
			.attr({
				'direction': heroDirection,
				'range': 500,
				'originX': player.position,
				'speed': 10,
				'attack': equipments[player.equipments.weapon].attack * atkMultiplier,
				'maxTargets': maxTargets
			})
		}, totalAtkSpeed/2)
	}

	// showRange(x1,x2)
	hero.attr('atkType',atkType)
    $('.weapon').css('animation-name','weapon-'+atkType)
    
    setTimeout(() => { 
        mode('rest')
        $('.weapon').css('animation-name','')
		setTimeout(() => { attackCooldown = false; }, totalAtkSpeed/4)
    },totalAtkSpeed)
}

function hit(enemy, attack) {
	attack = spread(attack,20)
	isCritical = random(1, 100) <= totalCritical
	if (isCritical) {
		attack = Math.round(attack * player.criticalMultiplier*1)
	}
    enemyType = $(enemy).attr('type')
    enemySize = enemies[enemyType].size[0] + enemies[enemyType].size[1]
    knockbackAmount = Math.max(5, Math.min(30, (attack/enemySize) * 100)) //kconback based on enemy size and attack
	
	$(enemy).attr({
		'state': 'enemy-hit',
		'angry': 'true', 
		'hp': $(enemy).attr('hp')-attack,
		'hit-count': $(enemy).attr('hit-count')*1+1
	})
	.css({
		'transition-duration': '50ms',
		'transition-timing-function': 'ease-out',
		'left': i($(enemy),'left')+heroDirection*knockbackAmount+'px'
	})
	.find('.bar').css('width', $(enemy).attr('hp')/enemies[$(enemy).attr('type')].hp*100+'%')

	damageColor = isCritical ? 'orange' : 'yellow'
	hitDigits = $('<div class="hit'+(isCritical ? ' critical' : '')+'">'+prettyNumber(attack, damageColor)+'</div>')
	.css('left', i($(enemy),'left')+i($(enemy),'width')/2-(String(attack).length*13))
	.appendTo('.field')
	setTimeout((hitDigits)=> { hitDigits.remove() },800, hitDigits)
	if ($(enemy).attr('hp') <= 0) { enemyDeath($(enemy)) } 
	else { setTimeout(() => {
		$(enemy).css('transition-timing-function', 'linear')
		enemyMove($(enemy), $(enemy).attr('hit-count'))
	}, 200) }

	sound('hit-1') 
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

function collide() {
	$('.enemy[active=true]').each(function() {
		if (player.position+10 < i($(this),'left') ||
			player.position-10 > i($(this),'left') + i($(this),'width') ||
			hero.attr('in-damage') == 'true' ||
			i(hero, 'margin-bottom') > i($(this),'height')-20 ||
			enemies[$(this).attr('type')].attack == 0)
		{ return }

		damage = spread(enemies[$(this).attr('type')].attack,20)

		for (equipment in player.equipments) {
			damage -= equipments[player.equipments[equipment]].defense
		}

		if (damage <= 0) { damage = 1 }
		player.hp -= damage

		$('body').append('<div class="hit self">'+prettyNumber(damage,'red')+'</div>')
		hero.attr('in-damage','true')
		
        knockbackDistance = Math.min(damage, 3); //hero knockback based on damage taken
		knockback = setInterval(() => { player.position -= heroDirection * knockbackDistance }, 10);
		setTimeout(() => { clearInterval(knockback); }, 200);
		
		setTimeout(() => {
			hero.attr('in-damage','false')
			$('.hit.self').remove()
		}, 1000)
	})
}
