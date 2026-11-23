const bossService = require('../boss/bossService');
const bossView = require('../boss/bossView');
const crateDb = require('../battle/crateDb');
const { fail } = require('../battle/commandUtil');
const { onCooldown, displayName } = require('../utils');

// sboss = tampilkan guild boss terakhir (aktif / kabur / sudah dikalahkan), memunculkan boss hanya kalau server belum pernah punya boss. sboss t = cek tiket.
// Boss muncul sendiri saat battle (10%, setelah jeda 1 jam dari boss sebelumnya) dan kabur kalau tidak dilawan dalam 1 jam.
module.exports = {
    name: 'boss',
    aliases: [],
    async execute(message, args = []) {
        if (!message.guild) return fail(message, 'this command only works in a server!');
        if (onCooldown(message, 'boss')) return;

        if (['t', 'ticket', 'tickets'].includes(String(args[0] || '').toLowerCase())) {
            const max = bossService.CONFIG.TICKETS_PER_DAY;
            const left = await bossService.ticketsLeft(message.author.id);
            const resetUnix = Math.floor((Date.now() + crateDb.msUntilReset()) / 1000);
            const icons = bossView.ticketIcons(left);
            return message.channel.send({
                embeds: [{
                    color: 0x7dbceb,
                    description: `${icons}\n\n**${displayName(message)}**, you currently have **${left}/${max}** boss ticket${left === 1 ? '' : 's'}!\n-# Replenishes <t:${resetUnix}:R>`
                }],
                allowedMentions: { parse: [] }
            });
        }

        const sent = await bossView.present(message.channel, message.guild.id);
        if (!sent) return fail(message, 'could not show the guild boss right now, try again!');
        return sent;
    }
};
