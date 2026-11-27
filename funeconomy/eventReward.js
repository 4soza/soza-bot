/*
 * Hadiah event: selama event aktif, hunt dan battle punya peluang menjatuhkan hadiah langsung ke inventory.
 * Maksimal 10 hadiah per hari per user (reset tengah malam WIB). Jendela event dari zoo/data.js (EVENTS).
 */
const Lootbox = require('../models/funeconomy/lootbox');
const Crate = require('../models/funeconomy/crate');
const Economy = require('../models/funeconomy/economy');
const crateDb = require('./battle/crateDb');
const gems = require('./zoo/gems');
const emojis = require('./customEmoji');
const cfg = require('./config');
const { activeEvent } = require('./eventAnnounce');

const DROP_CHANCE = 0.25; // peluang tiap hunt / battle menjatuhkan hadiah event
const DAILY_LIMIT = 10; // maksimal hadiah event per hari
const FLOOT_CHANCE = 0.02; // peluang hadiah berupa fabled lootbox (kecil)
const CASH = [1000, 10000];
const BOX = [1, 3];
const SHARDS = [300, 1000];
const DUPLICATE_KEY = 11000;

const between = ([lo, hi], rng) => lo + Math.floor(rng() * (hi - lo + 1));
const fmt = (n) => Math.round(n).toLocaleString('en-US');

async function ensure(userId) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await Lootbox.updateOne({ userId }, { $setOnInsert: { boxcount: 0, claimcount: 0, claimDay: -1 } }, { upsert: true });
            return;
        } catch (error) {
            if (error?.code !== DUPLICATE_KEY || attempt === 1) throw error;
        }
    }
}

/* Ambil satu jatah hari ini (atomik). Return nomor jatah (1-10) atau 0 kalau sudah habis. */
async function takeSlot(userId, today) {
    await ensure(userId);
    const fresh = await Lootbox.findOneAndUpdate(
        { userId, $or: [{ eventDay: { $exists: false } }, { eventDay: { $lt: today } }] },
        { $set: { eventDay: today, eventCount: 1 } },
        { new: true }
    ).lean();
    if (fresh) return 1;
    const more = await Lootbox.findOneAndUpdate(
        { userId, eventDay: today, eventCount: { $lt: DAILY_LIMIT } },
        { $inc: { eventCount: 1 } },
        { new: true }
    ).lean();
    return more ? more.eventCount : 0;
}

async function grant(userId, kind, rng) {
    if (kind === 'floot') {
        await Lootbox.updateOne({ userId }, { $inc: { fboxcount: 1 } });
        return `${emojis.floot()} **1** fabled lootbox`;
    }
    if (kind === 'cash') {
        const n = between(CASH, rng);
        await Economy.add(userId, n);
        return `${cfg.CASH_EMOJI} **${fmt(n)}**`;
    }
    if (kind === 'lootbox') {
        const n = between(BOX, rng);
        await Lootbox.updateOne({ userId }, { $inc: { boxcount: n } });
        return `${emojis.lootbox()} **${n}** lootbox`;
    }
    if (kind === 'crate') {
        const n = between(BOX, rng);
        await crateDb.addCrates(userId, n);
        return `${emojis.crate()} **${n}** weapon crate`;
    }
    if (kind === 'gem') {
        const gem = Object.values(gems.GEMS).find((g) => g.type === 'Special' && g.rank === 'fabled');
        await gems.addGems(userId, { [gem.key]: 1 });
        return `${gem.emoji} **1** fabled special gem`;
    }
    const n = between(SHARDS, rng);
    await Crate.updateOne({ userId }, { $inc: { shards: n } }, { upsert: true });
    return `${emojis.shard()} **${fmt(n)}** weapon shards`;
}

const KINDS = ['cash', 'lootbox', 'crate', 'gem', 'shards'];

/* Coba jatuhkan hadiah event. Return { text, count } atau null (bukan event / tidak beruntung / jatah habis). */
async function tryDrop(userId, { now = Date.now(), rng = Math.random } = {}) {
    if (!activeEvent(now)) return null;
    if (rng() >= DROP_CHANCE) return null;
    const count = await takeSlot(userId, crateDb.dayNumber(now));
    if (!count) return null;
    const kind = rng() < FLOOT_CHANCE ? 'floot' : KINDS[Math.floor(rng() * KINDS.length)];
    return { text: await grant(userId, kind, rng), count };
}

/* Panggil setelah hunt / battle berhasil. Kirim satu baris pesan kalau dapat hadiah. Tidak pernah melempar error. */
async function announceDrop(message, name) {
    try {
        const drop = await tryDrop(message.author.id);
        if (!drop) return null;
        return await message.channel.send({
            content: `🎄 **| ${name}**, you found an event item and it turned into ${drop.text}! \`[${drop.count}/${DAILY_LIMIT}]\``,
            allowedMentions: { parse: [] }
        });
    } catch (error) {
        console.error('[EVENT] reward failed:', error.message);
        return null;
    }
}

module.exports = { tryDrop, announceDrop, DROP_CHANCE, DAILY_LIMIT, FLOOT_CHANCE };
