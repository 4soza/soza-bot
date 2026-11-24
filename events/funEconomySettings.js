const settingsView = require('../funeconomy/battle/settingsView');

// Tombol sbs (fbs:...). Dimuat otomatis oleh handlers/events.js.
module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() || !interaction.customId.startsWith(`${settingsView.BUTTON_PREFIX}:`)) return;
        try {
            await settingsView.handleButton(interaction);
        } catch (error) {
            console.error('[FUNECONOMY] Battle settings button failed:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Something went wrong!', flags: 64 }).catch(() => {});
            }
        }
    }
};
