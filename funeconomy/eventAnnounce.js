/*
 * Pesan event otomatis (Components V2, gaya OwO "Dec Event FAQ").
 * Muncul saat ada yang memakai command fun economy selama event aktif, paling cepat 2 jam sekali per server.
 * Jendela event diambil dari zoo/data.js (EVENTS), jadi cukup ubah tanggal di sana.
 */
const { EVENTS, ANIMALS, RANKS } = require('./zoo/data');
const { getRarities } = require('./zoo/hunting');
const gems = require('./zoo/gems');
const emojis = require('./customEmoji');
const cfg = require('./config');

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // jeda pesan otomatis: 2 jam
const V2 = 32768;
const COLOR = 0x7ab8f5;
const EVENT_ITEMS_PER_DAY = 10;
const lastShown = new Map(); // guildId -> waktu (ms) pesan event terakhir

const text = (content) => ({ type: 10, content });
const sep = () => ({ type: 14, divider: true, spacing: 1 });
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/* Awal & akhir event (ms epoch). Tanggal di EVENTS memakai zona WIB (UTC+7), akhir = akhir hari terakhir. */
function windowOf(name) {
    const ev = EVENTS[name];
    if (!ev) return null;
    const wib = 7 * 3600 * 1000;
    return {
        start: Date.UTC(ev.start[0], ev.start[1] - 1, ev.start[2]) - wib,
        end: Date.UTC(ev.end[0], ev.end[1] - 1, ev.end[2] + 1) - wib
    };
}

function activeEvent(now = Date.now()) {
    for (const name of Object.keys(EVENTS)) {
        const w = windowOf(name);
        if (w && now >= w.start && now < w.end) return { name, ...w };
    }
    return null;
}

/* Format waktu seperti cooldown ("1 day 3 hours 5 minutes"), tanpa detik karena eventnya berhari-hari. */
function formatLeft(ms) {
    let minutes = Math.max(1, Math.ceil(ms / 60000));
    const days = Math.floor(minutes / 1440);
    minutes %= 1440;
    const hours = Math.floor(minutes / 60);
    minutes %= 60;
    const parts = [];
    if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes || !parts.length) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    return parts.join(' ');
}

function render(event, now = Date.now()) {
    const pets = Object.values(ANIMALS).filter((a) => a.event === event.name);
    // Peluang tiap hewan event = peluang rank special (sudah termasuk bonus event) x porsi hewan event / jumlah hewan
    const rate = pets.length ? (getRarities({ now: new Date(now) }).special * 0.9) / pets.length : 0;
    const fabledSpecial = Object.values(gems.GEMS).find((g) => g.type === 'Special' && g.rank === 'fabled');
    const gem = fabledSpecial?.emoji || '⭐';
    const special = RANKS.special.emoji;
    const rewards = [
        `${cfg.CASH_EMOJI} ${fmt(1000)}-${fmt(10000)}`,
        `${emojis.lootbox()} 1-3`,
        `${emojis.crate()} 1-3`,
        gem,
        `${emojis.shard()} 300-1,000`
    ].join(', ');
    const body = [
        '## 🎄❄️ MERRY CHRISTMAS EVERYONE! ❄️🎄',
        '**Dec Event FAQ**',
        '',
        '__What are the holidays being celebrated?__',
        '||Christmas, New Years and special Winter themed pet||',
        '__How long is the event?__',
        `Ends in **${formatLeft(event.end - now)}**`,
        `__How many ${special} pets are available?__`,
        `- Pet Amount: ||${pets.length} pets||`,
        `- Pet Names: ||${pets.map((a) => `${a.value} ${a.name}`).join(', ')}||`,
        `- Catch Rates: ${rate.toFixed(2)}% each`,
        `__Can I use my ${gem} Special Gems for this event?__`,
        'Yes, you can use your special gems during the event!',
        '',
        '**Dec FAQ**',
        '__How to get event rewards?__',
        'The rewards celebrating Dec holidays can be obtained via hunt and battle.',
        '__How many can I get per day?__',
        `You can get up to ${EVENT_ITEMS_PER_DAY} rewards per day!`,
        '__What does it do?__',
        'The rewards are added straight to your inventory.',
        `- Possible rewards: ||${rewards}, small chance for ${emojis.floot()}||`,
        '',
        'Merry Christmas to those who celebrate and Happy New Years!!'
    ].join('\n');
    return {
        components: [{
            type: 17,
            accent_color: COLOR,
            // Garis pemisah lalu waktu event dimulai (tampil seperti "December 27, 2025 12:10 PM" sesuai zona waktu pembaca)
            components: [text(body), sep(), text(`<t:${Math.floor(event.start / 1000)}:f>`)]
        }],
        flags: V2,
        allowedMentions: { parse: [] }
    };
}

/* Panggil setelah command fun economy jalan. Kirim pesan event kalau event aktif dan server ini belum dapat dalam 2 jam. */
async function maybeAnnounce(channel, guildId, now = Date.now()) {
    if (!channel || !guildId) return null;
    const event = activeEvent(now);
    if (!event) return null;
    if (now - (lastShown.get(guildId) ?? 0) < COOLDOWN_MS) return null;
    lastShown.set(guildId, now); // ditandai dulu supaya command bersamaan tidak mengirim dobel
    if (lastShown.size > 2000) for (const [id, t] of lastShown) if (now - t >= COOLDOWN_MS) lastShown.delete(id);
    return channel.send(render(event, now));
}

module.exports = { maybeAnnounce, activeEvent, windowOf, formatLeft, render, COOLDOWN_MS };
