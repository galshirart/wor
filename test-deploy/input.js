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
