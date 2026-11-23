const bossService = require('../boss/bossService');
const bossView = require('../boss/bossView');
const crateDb = require('../battle/crateDb');
const { fail } = require('../battle/commandUtil');
const cooldown = require('../cooldown');
const { onCooldown, displayName } = require('../utils');

// sboss = tampilkan guild boss terakhir; memunculkan boss baru kalau belum pernah ada boss atau boss terakhir sudah dikalahkan 5+ menit lalu. sboss t = cek tiket.
// Boss muncul sendiri saat battle (10%, setelah jeda 1 jam dari boss sebelumnya) dan kabur kalau tidak dilawan dalam 1 jam.
module.exports = {
    name: 'boss',
    aliases: [],
    async execute(message, args = []) {
        if (!message.guild) return fail(message, 'this command only works in a server!');
        if (['t', 'ticket', 'tickets'].includes(String(args[0] || '').toLowerCase())) {
            if (onCooldown(message, 'bossticket')) return;
            cooldown.start('bossticket', message.author.id);
            const max = bossService.CONFIG.TICKETS_PER_DAY;
            const left = await bossService.ticketsLeft(message.author.id);
            const resetUnix = Math.floor((Date.now() + crateDb.msUntilReset()) / 1000);
            // Ikon tiket di komponen teks sendiri (hanya emoji) supaya tampil besar seperti OwO
            return message.channel.send({
                flags: 32768,
                components: [{
                    type: 17,
                    accent_color: 0x7dbceb,
                    components: [
                        { type: 10, content: bossView.ticketIcons(left) },
                        { type: 10, content: `**${displayName(message)}**, you currently have **${left}/${max}** boss ticket${left === 1 ? '' : 's'}!\n-# Replenishes <t:${resetUnix}:R>` }
                    ]
                }],
                allowedMentions: { parse: [] }
            });
        }

        if (onCooldown(message, 'boss')) return;
        cooldown.start('boss', message.author.id);

        const sent = await bossView.present(message.channel, message.guild.id);
        if (!sent) return fail(message, 'could not show the guild boss right now, try again!');
        return sent;
    }
};
