
function number(input) {
    if (typeof input !== 'string') {
        return 0; // or some default value
    }
    return Math.round(parseFloat(input));
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