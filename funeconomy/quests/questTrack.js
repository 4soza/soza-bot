const cfg = require('../config');
const db = require('./questDb');
const cooldown = require('../cooldown');
const data = require('./questData');
const emojis = require('../customEmoji');
const { displayName } = require('../utils');

const EXPIRE_MS = 10 * 60 * 1000;
const BLUE = 0x7ab8f5;
const GRAY = 0x4f545c;
const timers = new Map(); // id pesan -> timer

function noticeBox(userId, text, expired) {
    return {
        type: 17,
        accent_color: expired ? GRAY : BLUE,
        components: [{
            type: 9,
            components: [{ type: 10, content: text }],
            accessory: {
                type: 2, style: 2, disabled: expired, custom_id: `fquest:quests:${userId}:view`,
                emoji: emojis.button(emojis.get('search'))
            }
        }]
    };
}

/** Batalkan timer kadaluarsa (dipanggil saat tombol 🔍 diklik, karena pesan sudah berubah jadi daftar quest). */
function cancelExpire(messageId) {
    const timer = timers.get(messageId);
    if (timer) clearTimeout(timer);
    timers.delete(messageId);
}

/**
 * Pesan "quest selesai" gaya OwO: awalnya biru, tombol 🔍 mengganti pesan jadi daftar quest.
 * Setelah 10 menit warnanya abu-abu dan tombol 🔍 tidak bisa diklik. finished = array quest dari db.track.
 */
async function notifyFinished(channel, userId, name, finished) {
    const text = finished.map((q) => {
        const info = data.QUESTS[q.name];
        const goal = data.questGoal(q.name, q.level);
        const count = q.name === 'find' ? info.count[q.level] : goal;
        return `🎉 | **${name}**, You completed a quest: \`${info.text(count)}\`!`;
    }).join('\n');
    const sent = await channel.send({
        flags: 32768,
        components: [noticeBox(userId, text, false)],
        allowedMentions: { parse: [] }
    });
    const timer = setTimeout(() => {
        timers.delete(sent.id);
        sent.edit({ flags: 32768, components: [noticeBox(userId, text, true)], allowedMentions: { parse: [] } }).catch(() => {});
    }, EXPIRE_MS);
    timer.unref?.();
    timers.set(sent.id, timer);
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

module.exports = { trackFor, notifyFinished, cancelExpire, EXPIRE_MS };
