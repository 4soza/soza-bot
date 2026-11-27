/*
 * Gambar battle (dua tim, bar HP/WP, senjata) memakai @napi-rs/canvas.
 * Terinspirasi tampilan battle OwO Bot (CC BY-NC-SA 4.0), digambar ulang untuk bot ini.
 *
 * Emoji digambar dari gambar Twemoji (diunduh sekali lalu disimpan di memori) supaya tidak
 * bergantung pada font emoji di server. Kalau unduhan gagal, dipakai font emoji sistem.
 */
const path = require('path');
// Dimuat saat dipakai, supaya modul lain tetap bisa dimuat kalau canvas tidak terpasang.
const canvasLib = () => require('@napi-rs/canvas');

const FONT = 'SozaBattleFont';
let fontReady = false;
function ensureFont() {
    if (fontReady) return;
    fontReady = true;
    try {
        canvasLib().GlobalFonts.registerFromPath(path.join(__dirname, '../../UI/fonts/AfacadFlux-Regular.ttf'), FONT);
    } catch { /* pakai font sistem */ }
}
const font = (size, weight = 'bold') => `${weight} ${size}px ${FONT}, 'Segoe UI', Arial, sans-serif`;

const TWEMOJI_URL = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/';
const FETCH_TIMEOUT_MS = 4000;
const emojiCache = new Map(); // codepoints -> Promise<Image|null>
let emojiLoader = (url) => canvasLib().loadImage(url);

/** Nama file Twemoji untuk satu emoji (aturan: buang FE0F kecuali ada ZWJ). */
function twemojiCode(emoji) {
    const raw = String(emoji || '');
    const text = raw.includes('‍') ? raw : raw.replace(/️/g, '');
    const codes = [];
    for (const ch of text) codes.push(ch.codePointAt(0).toString(16));
    return codes.join('-');
}

function loadEmoji(emoji) {
    const customId = require('../customEmoji').customId(emoji);
    const code = customId ? `custom-${customId}` : twemojiCode(emoji);
    if (!code) return Promise.resolve(null);
    if (!emojiCache.has(code)) {
        const attempt = Promise.race([
            emojiLoader(customId ? `https://cdn.discordapp.com/emojis/${customId}.png?size=64` : `${TWEMOJI_URL}${code}.png`),
            new Promise((resolve) => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS))
        ]).catch(() => null);
        // Gagal tidak disimpan supaya bisa dicoba lagi di battle berikutnya.
        emojiCache.set(code, attempt.then((img) => { if (!img) emojiCache.delete(code); return img; }));
    }
    return emojiCache.get(code);
}

function drawEmoji(ctx, emoji, img, x, y, size) {
    if (img) {
        ctx.drawImage(img, x, y, size, size);
        return;
    }
    ctx.save();
    ctx.font = `${Math.round(size * 0.82)}px ${FONT}, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(emoji || '?'), x + size / 2, y + size / 2 + 2);
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fit(ctx, text, maxWidth) {
    let t = String(text ?? '');
    if (ctx.measureText(t).width <= maxWidth) return t;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
}

const nonNeg = (n) => Math.max(0, Math.ceil(Number(n) || 0));

/** Ringkas data satu hewan untuk digambar. */
function describe(animal) {
    const s = animal.stats;
    const weapon = animal.weapon;
    const WI = require('./WeaponInterface');
    const sum = (v) => nonNeg((v?.[0] || 0) + (v?.[1] || 0));
    const emojis = require('../customEmoji');
    return {
        icon: animal.animal?.uni || animal.animal?.value || '❔',
        name: animal.nickname || animal.animal?.name || '?',
        lvl: s.lvl,
        hp: nonNeg(s.hp[0]),
        hpMax: nonNeg(s.hp[1] + s.hp[3]),
        wp: nonNeg(s.wp[0]),
        wpMax: nonNeg(s.wp[1] + s.wp[3]),
        weaponIcon: weapon?.emoji || null,
        stats: [
            { icon: emojis.get('stat_str'), text: String(sum(s.att)) },
            { icon: emojis.get('stat_mag'), text: String(sum(s.mag)) },
            { icon: emojis.get('stat_pr'), text: WI.resToPrettyPercent(s.pr) },
            { icon: emojis.get('stat_mr'), text: WI.resToPrettyPercent(s.mr) }
        ],
        buffIcons: (animal.buffs || []).map((b) => b.emoji).filter(Boolean)
    };
}

// Tampilan ala OwO (kotak hewan, bar HP/WP bergaris, stat, senjata). Satuan di bawah mengikuti gambar OwO 456 lebar.
const W = 456;
const ROW_H = 77;
const TOP = 6;
const SCALE = 3;
const BG = '#252429';
const LINE = '#d8d8d8';
const BOX = 66;

/**
 * Gambar state battle saat ini (state hewan sudah disesuaikan dengan turn yang ditampilkan).
 * Tim pemain di kiri, tim musuh di kanan (cermin), latar abu-abu. Return Buffer PNG.
 */
async function renderBattleImage(playerTeam, enemyTeam) {
    ensureFont();
    const { createCanvas } = canvasLib();
    const left = playerTeam.map(describe);
    const right = enemyTeam.map(describe);
    const rows = Math.max(left.length, right.length, 1);
    const H = TOP + rows * ROW_H - 1;

    const wanted = new Set();
    for (const a of [...left, ...right]) {
        wanted.add(a.icon);
        if (a.weaponIcon) wanted.add(a.weaponIcon);
        a.buffIcons.forEach((e) => wanted.add(e));
        a.stats.forEach((st) => wanted.add(st.icon));
    }
    const images = new Map(await Promise.all([...wanted].map(async (e) => [e, await loadEmoji(e)])));

    const canvas = createCanvas(W * SCALE, H * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;

    const bar = (x, y, w, h, ratio, color, text, fromRight) => {
        const r = Math.max(0, Math.min(1, ratio));
        if (r > 0) {
            ctx.fillStyle = color;
            const fw = Math.max(1, Math.round((w - 1) * r));
            if (fromRight) ctx.fillRect(x + w - 0.5 - fw, y + 0.5, fw, h - 1);
            else ctx.fillRect(x + 0.5, y + 0.5, fw, h - 1);
        }
        ctx.strokeStyle = LINE;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = font(10, 'normal');
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w - 3, y + h / 2 + 0.5);
    };

    const drawAnimal = (a, x0, y0, side) => {
        const dead = a.hp <= 0;
        const isLeft = side === 'player';
        ctx.save();
        if (dead) ctx.globalAlpha = 0.35;

        // kotak hewan
        const boxX = isLeft ? x0 : W - 6 - BOX;
        ctx.strokeStyle = LINE;
        ctx.strokeRect(boxX + 0.5, y0 + 0.5, BOX - 1, BOX - 1);
        drawEmoji(ctx, a.icon, images.get(a.icon), boxX + 6, y0 + 6, BOX - 12);

        // bar HP dan WP
        const barX = isLeft ? boxX + BOX : 6 + 0; // kanan: bar mulai dari x=250 sampai kotak hewan
        const barW = isLeft ? 134 : (boxX - 250);
        const bx = isLeft ? barX : 250;
        bar(bx, y0, barW, 12, a.hpMax ? a.hp / a.hpMax : 0, '#a94442', `${a.hp}/${a.hpMax}`, !isLeft);
        bar(bx, y0 + 11, barW, 12, a.wpMax ? a.wp / a.wpMax : 0, '#4e66a8', `${a.wp}/${a.wpMax}`, !isLeft);

        // nama
        ctx.font = font(10, 'normal');
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'alphabetic';
        const nm = fit(ctx, a.name, 120);
        if (isLeft) { ctx.textAlign = 'right'; ctx.fillText(nm, bx + barW - 2, y0 + 36); }
        else { ctx.textAlign = 'left'; ctx.fillText(nm, bx + 2, y0 + 36); }

        // stat (4 baris)
        const sy = y0 + 39;
        // Letak stat tetap; kalau tidak punya senjata, hanya gambar senjatanya yang dikosongkan.
        const statX = isLeft ? bx + 35 : bx + 90;
        a.stats.forEach((st, i) => {
            const ry = sy + i * 7.2;
            ctx.font = font(8.5, 'normal');
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            if (isLeft) {
                drawEmoji(ctx, st.icon, images.get(st.icon), statX, ry, 7);
                ctx.textAlign = 'left';
                ctx.fillText(st.text, statX + 10, ry + 3.5);
            } else {
                ctx.textAlign = 'right';
                ctx.fillText(st.text, statX - 2, ry + 3.5);
                drawEmoji(ctx, st.icon, images.get(st.icon), statX, ry, 7);
            }
        });

        // senjata
        const wSize = 32;
        const wx = isLeft ? bx + 2 : bx + barW - wSize - 2;
        if (a.weaponIcon) drawEmoji(ctx, a.weaponIcon, images.get(a.weaponIcon), wx, y0 + 38, wSize);

        // buff saja (tanpa passive): tim kiri di kanan stat, tim kanan di kiri stat, sejajar seperti OwO
        a.buffIcons.slice(0, 4).forEach((e, i) => {
            const bxp = isLeft ? statX + 33 + i * 17 : bx + 52 - i * 17;
            drawEmoji(ctx, e, images.get(e), bxp, y0 + 40, 16);
        });
        ctx.restore();
    };

    left.forEach((a, i) => drawAnimal(a, 6, TOP + i * ROW_H, 'player'));
    right.forEach((a, i) => drawAnimal(a, 0, TOP + i * ROW_H, 'enemy'));

    return canvas.toBuffer('image/png');
}

module.exports = { renderBattleImage, twemojiCode, describe, loadEmoji, drawEmoji, ensureFont, font, canvasLib, _setEmojiLoader: (fn) => { emojiLoader = fn; emojiCache.clear(); } };
