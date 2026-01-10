/**
 * Menu UI Module
 * 
 * Handles the game pause menu with continue, restart, sound toggle, and teleport.
 */

const MenuUI = {
    /**
     * Open the game menu and pause the game
     */
    open() {
        if ($('.card.menu').is(':visible')) {
            return;
        }

        // Close any other open cards first
        UI.closeCard();

        // Pause the game
        this._pauseGame();

        // Build and show menu
        const menu = this._buildMenu();
        $('.window').append(menu);

        sound('click');
    },

    /**
     * Close the menu and resume the game
     */
    close() {
        $('.card.menu').remove();
        this._resumeGame();
        sound('click');
    },

    /**
     * Toggle menu visibility
     */
    toggle() {
        if ($('.card.menu').is(':visible')) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Restart the game
     */
    restart() {
        this.close();
        GameState.resetPlayer();
    },

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        GameState.soundEnabled = !GameState.soundEnabled;
        this._updateSoundCheckbox();
        
        // Play a sound to confirm (if sound is now enabled)
        if (GameState.soundEnabled) {
            sound('click');
        }
    },

    /**
     * Teleport to selected map
     * @param {string} mapId - Map identifier
     */
    teleportTo(mapId) {
        if (!mapId) return;
        
        this.close();
        MapManager.teleport(mapId);
    },

    // ========== PRIVATE HELPERS ==========

    /**
     * Pause the game loop
     */
    _pauseGame() {
        GameState.paused = true;
        
        // Freeze enemies at their current position
        $('.enemy').each(function() {
            const $enemy = $(this);
            // Get the current computed position (mid-transition)
            const computedLeft = window.getComputedStyle(this).left;
            // Store original transition-duration to restore later
            $enemy.data('pause-transition', $enemy.css('transition-duration'));
            // Disable transition FIRST, then set position
            $enemy.css('transition-duration', '0s');
            $enemy.css('left', computedLeft);
        });
        
        $('.window').addClass('paused');
    },

    /**
     * Resume the game loop
     */
    _resumeGame() {
        $('.window').removeClass('paused');
        
        // Restore enemies' transitions and reset their state
        $('.enemy').each(function() {
            const $enemy = $(this);
            const originalTransition = $enemy.data('pause-transition');
            if (originalTransition) {
                // Clear transition data
                $enemy.removeData('pause-transition');
            }
            // Reset transition to allow fresh movement
            $enemy.css('transition-duration', '');
            // Set to stand so move() will start fresh movement
            $enemy.attr('state', 'stand');
        });
        
        GameState.paused = false;
    },

    /**
     * Build the menu HTML
     * @returns {jQuery}
     */
    _buildMenu() {
        const menu = $('<div class="card menu center"></div>');

        // Title
        menu.append('<div class="menu-title"><h3>MENU</h3></div>');

        // Continue button
        menu.append(`
            <div class="menu-item">
                <div class="button yellow menu-button" onclick="MenuUI.close()">CONTINUE</div>
            </div>
        `);

        // Sound toggle
        const soundChecked = GameState.soundEnabled ? 'checked' : '';
        menu.append(`
            <div class="menu-item flex menu-sound-row" onclick="MenuUI.toggleSound()">
                <label>SOUND</label>
                <div class="menu-checkbox ${soundChecked}"></div>
            </div>
        `);

        // Teleport dropdown
        const teleportSection = $('<div class="menu-item"></div>');
        teleportSection.append('<label>TELEPORT</label>');
        
        const select = $('<select class="menu-select" onchange="MenuUI.teleportTo(this.value)"></select>');
        select.append('<option value="">-- Select Map --</option>');
        
        // Populate maps from GameState
        if (GameState.maps) {
            Object.keys(GameState.maps).sort().forEach(mapId => {
                const displayName = spcDash(mapId);
                const selected = mapId === GameState.player.location ? 'selected' : '';
                select.append(`<option value="${mapId}" ${selected}>${displayName}</option>`);
            });
        }
        
        teleportSection.append(select);
        menu.append(teleportSection);

        // Shefa (debug items) button
        menu.append(`
            <div class="menu-item">
                <div class="button menu-button shefa-button" onclick="MenuUI.close(); shefa();">SHEFA</div>
            </div>
        `);

        // Restart button
        menu.append(`
            <div class="menu-item">
                <div class="button menu-button restart-button" onclick="MenuUI.restart()">RESTART GAME</div>
            </div>
        `);

        return menu;
    },

    /**
     * Update the sound checkbox visual state
     */
    _updateSoundCheckbox() {
        const checkbox = $('.menu-checkbox');
        if (GameState.soundEnabled) {
            checkbox.addClass('checked');
        } else {
            checkbox.removeClass('checked');
        }
    }
};
