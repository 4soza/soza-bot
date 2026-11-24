const cfg = require('../config');
const db = require('./questDb');
const cooldown = require('../cooldown');
const data = require('./questData');
const emojis = require('../customEmoji');
const { displayName } = require('../utils');

/**
 * Pesan "quest selesai" gaya OwO (kotak Components V2): tombol 🔍 mengganti pesan ini jadi daftar quest.
 * finished = array quest dari db.track.
 */
async function notifyFinished(channel, userId, name, finished) {
    const lines = finished.map((q) => {
        const info = data.QUESTS[q.name];
        const goal = data.questGoal(q.name, q.level);
        const count = q.name === 'find' ? info.count[q.level] : goal;
        return `🎉 | **${name}**, You completed a quest: \`${info.text(count)}\`!`;
    });
    await channel.send({
        flags: 32768,
        components: [{
            type: 17,
            accent_color: 0x4f545c,
            components: [{
                type: 9,
                components: [{ type: 10, content: lines.join('\n') }],
                accessory: { type: 2, style: 2, custom_id: `fquest:quests:${userId}:view`, emoji: emojis.button(emojis.get('search')) }
            }]
        }],
        allowedMentions: { parse: [] }
    });
}

/**
 * Catat progres task/quest untuk pengirim pesan lalu beri tahu kalau ada quest yang baru selesai.
 * Tidak pernah melempar error dan tidak perlu di-await.
 */
async function trackFor(message, key, options = {}) {
    try {
        const finished = await db.track(message.author.id, key, options);
        if (finished.length) await notifyFinished(message.channel, message.author.id, displayName(message), finished);
    } catch (error) {
        console.error('[FUNECONOMY] quest notify failed:', error.message);
    }
}

// Game taruhan: cooldown dimulai hanya setelah taruhan diterima, jadi itu saat yang tepat menghitung "gamble".
const GAMBLE_GAMES = new Set(['slots', 'cf', 'bj', 'mines', 'hl', 'rl']);
cooldown.onStart((game, userId) => {
    if (GAMBLE_GAMES.has(game)) db.track(userId, 'gamble');
});

module.exports = { trackFor, notifyFinished };
