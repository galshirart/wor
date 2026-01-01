function sound(sound) {
	let audio = new Audio('sounds/'+sound+'.wav');
	if (sound === 'attack-6') {
		audio.volume = 0.5;
	}
	audio.play();
}