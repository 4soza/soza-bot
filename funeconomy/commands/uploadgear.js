const fs = require('fs');
const path = require('path');
const { isBotOwner } = require('../../utils/botOwnerOnly');
const emojis = require('../customEmoji');

// Perintah sekali pakai: unggah emoji weapon/passive berbingkai rarity (w_<nama>_<rank>, p_<nama>_<rank>)
// ke Application Emojis bot. Hanya pemilik bot (DISCORD_USER_ID). Data dibaca dari funeconomy/gearEmojiData.json.
//   suploadgear            -> unggah yang belum ada
//   suploadgear replace    -> hapus lalu unggah ulang yang sudah ada
// Setelah selesai, emoji langsung dipakai (tanpa restart). File ini dan gearEmojiData.json boleh dihapus dari repo.
const DATA_FILE = path.join(__dirname, '..', 'gearEmojiData.json');
const EMOJI_DIR = path.join(__dirname, '..', '..', 'assets', 'emoji');

// Emoji weapon boss (b<c|u|r|e|m|l|f><nama>.png) dibaca langsung dari assets/emoji.
function bossFiles() {
    try {
        return fs.readdirSync(EMOJI_DIR).filter((f) => /^b[curemlf][a-z]+\.png$/.test(f) && f !== 'blank_box.png' && !f.startsWith('boss_'));
    } catch { return []; }
}

module.exports = {
    name: 'uploadgear',
    aliases: [],
    async execute(message, args, client) {
        if (!isBotOwner(message)) return;
        if (!fs.existsSync(DATA_FILE)) {
            return message.reply({
                content: 'File `funeconomy/gearEmojiData.json` tidak ditemukan. Upload dulu ke repo.',
                allowedMentions: { repliedUser: false }
            });
        }
        const replace = String(args[0] || '').toLowerCase() === 'replace';
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const bosses = bossFiles();
        const names = [...Object.keys(data), ...bosses.map((f) => f.slice(0, -4))];
        const status = await message.reply({ content: `Mengunggah ${names.length} emoji weapon/passive/weapon boss...`, allowedMentions: { repliedUser: false } });

        await client.application.emojis.fetch();
        let uploaded = 0;
        let skipped = 0;
        const failed = [];
        // Passive Tide dan Frostbite lama diganti Frost Armor: hapus emoji lama (p_tide_*, p_frostbite_*, p_rend_*, p_wildfire_*) yang tersisa di bot.
        for (const old of [...client.application.emojis.cache.values()].filter((e) => ['p_frostbite_', 'p_tide_', 'p_rend_', 'p_wildfire_'].some((prefix) => e.name?.startsWith(prefix)))) {
            await client.application.emojis.delete(old.id).catch(() => {});
            client.application.emojis.cache.delete(old.id);
        }
        for (const [index, name] of names.entries()) {
            try {
                const existing = client.application.emojis.cache.find((e) => e.name === name);
                if (existing && !replace) skipped += 1;
                else {
                    if (existing) {
                        await client.application.emojis.delete(existing.id);
                        client.application.emojis.cache.delete(existing.id);
                    }
                    const attachment = data[name]
                        ? `data:image/png;base64,${data[name]}`
                        : fs.readFileSync(path.join(EMOJI_DIR, `${name}.png`));
                    await client.application.emojis.create({ attachment, name });
                    uploaded += 1;
                }
            } catch (error) {
                failed.push(`${name}: ${error.message}`);
            }
            if ((index + 1) % 20 === 0 && index + 1 < names.length) {
                await status.edit(`Mengunggah emoji... ${index + 1}/${names.length}`).catch(() => {});
            }
        }
        // Pasang emoji yang baru diunggah supaya langsung dipakai tanpa restart.
        await emojis.sync(client).catch(() => {});

        const lines = [`Selesai. Diunggah: **${uploaded}**, dilewati (sudah ada): **${skipped}**, gagal: **${failed.length}**.`];
        if (failed.length) lines.push(`\`\`\`\n${failed.slice(0, 5).join('\n')}\n\`\`\``);
        return status.edit(lines.join('\n')).catch(() => message.channel.send(lines.join('\n')));
    }
};
