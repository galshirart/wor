latestVersion = 6
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
	consumables = data['consumables']

	player = JSON.parse(localStorage.getItem('player'))
	if (!player || player.version != latestVersion) { resetPlayer() }

	keyState = {left: false, right: false};
	heroDirection = 1
	attackCooldown = false;
	skillCooldown = false;
	tutorialInterval = null;
	activeConsumables = [];

	setStats()
	setHero()
	setBackpack()
	setConsumables()
	enterMap()
})


function save() {
	localStorage.setItem('player', JSON.stringify(player))
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



function shefa(){
	acquire('wood-sword')
	acquire('wood-bow')
	acquire('wood-shield')
	acquire('red-bandana')
	acquire('coconut-water',20)
	acquire('speed-potion',15)
	acquire('turbo-berry',10)
	acquire('focus-potion',10)
	$('.card.backpack').show()
}
