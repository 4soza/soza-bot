const { EmbedBuilder } = require('discord.js');
const cfg = require('../config');
const Economy = require('../../models/funeconomy/economy');
const lottery = require('../lottery');
const cooldown = require('../cooldown');
const {
    fmt, displayName, send, sendTemporaryError, sendEmbed, canEmbed, parseAmount, isAmountToken, errorLine,
    formatDuration, acquireGambleLock, releaseGambleLock, onCooldown
} = require('../utils');

const { EMBED_COLOR } = require('../battle/battleDisplay');

const MAX = cfg.LOTTERY.MAX_PER_LOTTERY;

const code = (value) => '```fix\n' + value + '```';

/* Peluang menang seperti OwO: >= 0.01% dipotong 2 desimal, di bawahnya angka penuh. */
function chanceText(mine, pool) {
    if (!mine) return '0%';
    let pct = pool ? (mine / pool) * 100 : 100;
    if (pct >= 0.01) pct = Math.trunc(pct * 100) / 100;
    const str = String(pct);
    return `${/e/i.test(str) ? pct.toFixed(20).replace(/0+$/, '') : str}%`;
}

function timeLeft() {
    const total = Math.max(0, Math.floor(lottery.msUntilReset() / 1000));
    return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m ${total % 60}s`;
}

const cash = (n) => `${fmt(n)} ${cfg.CASH_NAME.charAt(0).toUpperCase()}${cfg.CASH_NAME.slice(1)}`;
const FOOTER = '*Percentage and jackpot may change over time';

/* Tampilan status (tanpa jumlah), sama seperti OwO. */
function statusEmbed(name, status) {
    return new EmbedBuilder()
        .setAuthor({ name: `${name}'s Lottery Status` })
        .setColor(0x4a9fe2)
        .setDescription(`Lottery ends every day, next draw **<t:${Math.ceil((Date.now() + lottery.msUntilReset()) / 1000)}:R>**! Good Luck!!`)
        .addFields(
            { name: 'Your Total Submission', value: code(cash(status.mine)), inline: true },
            { name: 'Winning Chance', value: code(chanceText(status.mine, status.pool)), inline: true },
            { name: 'Number of Risk Takers', value: code(`${fmt(status.players)} users`), inline: true },
            { name: 'Current Jackpot', value: code(cash(status.pool + cfg.LOTTERY.BONUS)), inline: true },
            { name: 'Ends in', value: code(timeLeft()), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: FOOTER });
}

/* Tampilan setelah memasang taruhan, sama seperti OwO. */
function embedFor(name, status, added) {
    return new EmbedBuilder()
        .setAuthor({ name: `${name}'s Lottery Submission` })
        .setColor(EMBED_COLOR)
        .setDescription(`Lottery ends once a day! The maximum lottery submission is ${fmt(MAX / 1000)}k ${cfg.CASH_NAME}!`)
        .addFields(
            { name: 'You added', value: code(cash(added)), inline: true },
            { name: 'Your Total Submission', value: code(cash(status.mine)), inline: true },
            { name: 'Winning Chance', value: code(chanceText(status.mine, status.pool)), inline: true },
            { name: 'Current Jackpot', value: code(cash(status.pool + cfg.LOTTERY.BONUS)), inline: true },
            { name: 'Ends in', value: code(timeLeft()), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: FOOTER });
}

module.exports = {
    name: 'lottery',
    aliases: ['bet', 'lotto'],
    async execute(message, args, client) {
        const userId = message.author.id;
        const name = displayName(message);

        if (!canEmbed(message)) {
            return send(message, errorLine(name, 'I need the **Embed Links** permission in this channel to show the lottery!'));
        }
        if (args.length > 1 || (args[0] && !isAmountToken(args[0]))) {
            return send(message, errorLine(name, `wrong arguments! Usage: \`${cfg.PREFIX}lottery [amount|all]\``));
        }
        if (onCooldown(message, 'lottery')) return;
        if (!acquireGambleLock(userId)) return;

        try {
            await lottery.settleDue(client).catch((e) => console.error('[FUNECONOMY] Lottery settle failed:', e));

            const day = lottery.dayNumber();
            const status = await lottery.getStatus(day, userId);
            const plainName = message.member?.displayName ?? message.author.username;

            // Tanpa jumlah = hanya lihat status lottery
            if (!args[0]) {
                cooldown.start('lottery', userId);
                return sendEmbed(message, statusEmbed(plainName, status));
            }

            const remaining = MAX - status.mine;
            if (remaining <= 0) {
                return send(message, errorLine(name, `you can only bet up to **${fmt(MAX)}** per lottery!`));
            }

            const balance = await Economy.getBetBalance(userId);
            let bet = parseAmount(args[0], balance, remaining);
            if (!Number.isSafeInteger(bet) || bet < cfg.MIN_BET) {
                if (args[0].toLowerCase() === 'all') return sendTemporaryError(message, errorLine(name, `you don't have any ${cfg.CASH_NAME} to bet!`));
                return send(message, errorLine(name, `you need to bet at least **${fmt(cfg.MIN_BET)}**!`));
            }
            // Seperti OwO: kalau melebihi batas, taruhan dipotong sampai batas maksimal.
            if (bet > remaining) bet = remaining;
            if (balance < bet) return sendTemporaryError(message, errorLine(name, `you don't have enough ${cfg.CASH_NAME}!`));

            const debited = await Economy.deductBet(userId, bet);
            if (!debited) return sendTemporaryError(message, errorLine(name, `you don't have enough ${cfg.CASH_NAME}!`));

            let entry;
            try {
                entry = await lottery.addEntry(day, userId, bet);
            } catch (error) {
                await Economy.addGamePayout(userId, bet).catch((e) => console.error('[FUNECONOMY] Lottery refund failed:', e));
                throw error;
            }
            if (!entry) {
                // Batas per lottery terlewati (balapan antar command): kembalikan taruhan
                await Economy.addGamePayout(userId, bet);
                return send(message, errorLine(name, `you can only bet up to **${fmt(MAX)}** per lottery!`));
            }

            cooldown.start('lottery', userId);
            const updated = await lottery.getStatus(day, userId);
            return sendEmbed(message, embedFor(plainName, updated, bet));
        } finally {
            releaseGambleLock(userId);
        }
    }
};