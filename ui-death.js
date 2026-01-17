/**
 * Death UI Module
 * 
 * Handles the death screen and transition to death-gate map.
 */

const DeathUI = {
    isOpen: false,
    /**
     * Show the death card and teleport to death-gate.
     */
    showDeathCard() {
        const state = GameState;
        if ($('.card.death').is(':visible')) {
            return;
        }
        UI.closeCard();

        this.isOpen = true;

        // Visual effect
        $('.window').addClass('death-screen');

        const card = $('<div class="card middle death"></div>').appendTo('.window');
        card.append('<div><h3>YOU DIED</h3></div>');
        card.append('<div class="tip">The Twirl has claimed you...</div>');
        card.append('<div class="actions"><div class="button yellow">CONTINUE</div></div>');
        card.find('.button').on('click', () => this.continueAfterDeath());
    },


    /**
     * Continue after death: teleport to revive map and restore resources.
     */
    continueAfterDeath() {
        const state = GameState;

        this.isOpen = false;
        $('.card.death').remove();        
        // Reset flags that would otherwise cause immediate re-hit
        state.hero?.attr('in-damage', 'false');
        state.isBlocking = false;
        
        setTimeout(() => {
            MapManager.teleport(Constants.DEATH_MAP);
            state.heroIsDead = false;
            $('.window').removeClass('death-screen'); //back to original colors
        }, 100);
    },
};
