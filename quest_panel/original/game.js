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
	dialogInterval = null;

	setStats()
	setHero()
	setBackpack()
	setConsumables()
	enterMap()

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
			case 49: consume(1); break;
			case 50: consume(2); break;
			case 51: consume(3); break;
			case 52: consume(4); break;
			case 53: consume(5); break;
			case 54: consume(6); break;
			case 55: consume(7); break;
			case 56: consume(8); break;
			case 57: consume(9); break;
		}
	}
		
	document.onkeyup = (e) => {
		switch(e.keyCode) { 
			case 39: keyState.right = false; break;
			case 37: keyState.left = false; break;
		}
	}
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
	acquire('speed-potion',20)
	acquire('turbo-berry',20)
	acquire('focus-potion',20)
	$('.card.backpack').show()
}
