/**
 * Audio Module
 * 
 * Handles all sound playback.
 */

const Audio = {
    // Volume overrides for specific sounds
    VOLUME_OVERRIDES: {
        'attack-6': 0.5
    },
    
    /**
     * Play a sound effect
     * @param {string} soundName - Name of sound file (without extension)
     */
    play(soundName) {
        // Check if sound is enabled
        if (!GameState.soundEnabled) {
            return;
        }
        
        const audio = new window.Audio(`sounds/${soundName}.wav`);
        
        if (this.VOLUME_OVERRIDES[soundName]) {
            audio.volume = this.VOLUME_OVERRIDES[soundName];
        }
        
        audio.play();
    }
};

// Shorthand alias for easy migration
const sound = (soundName) => Audio.play(soundName);
