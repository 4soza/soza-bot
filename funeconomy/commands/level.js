const { AttachmentBuilder, PermissionsBitField } = require('discord.js');
const cfg = require('../config');
const Level = require('../../models/funeconomy/level');
const LevelCardPreference = require('../../models/funeconomy/levelCardPreference');
const { CATEGORIES } = require('../../models/funeconomy/ranking');
const { progress } = require('../leveling');
const { fmt, displayName, send, errorLine } = require('../utils');

module.exports = {
    name: 'level',
    aliases: ['lvl', 'xp'],
    async execute(message, args, client) {
        const name = displayName(message);

        let target = message.mentions.users.first() || null;
        const idArg = args.find((arg) => /^\d{17,20}$/.test(arg));
        if (!target && idArg) target = await client.users.fetch(idArg).catch(() => null);
        if (args.length > 0 && !target) {
            return send(message, errorLine(name, `wrong arguments! Usage: \`${cfg.PREFIX}level [@user]\``));
        }
        target = target || message.author;
        if (target.bot) return send(message, errorLine(name, "bots don't have a level!"));

        // Semua yang dibutuhkan kartu diambil bersamaan (profil, rank, background, avatar) supaya kartu cepat muncul seperti OwO.
        const me = message.guild.members.me;
        const canAttach = !!me && !!message.channel.permissionsFor?.(me)?.has(PermissionsBitField.Flags.AttachFiles);
        const avatarURL = target.displayAvatarURL?.({ extension: 'png', size: 256 }) ?? null;
        const { shared } = require('../levelUpCard');
        shared.ensureFont();
        const [profile, ranking, backgroundBuffer] = await Promise.all([
            Level.getProfile(target.id),
            // Rank global berdasarkan XP, seperti rank di kartu level OwO.
            CATEGORIES.level.rankOf(target.id, { scope: 'global' }).catch(() => null),
            canAttach ? LevelCardPreference.getBackgroundBuffer(target.id).catch(() => null) : null,
            canAttach ? shared.loadAvatar(avatarURL) : null
        ]);
        const member = message.guild.members.cache.get(target.id);
        const rawName = target.username;
        if (!profile) {
            return send(message, errorLine(name, `**${displayName({ member, author: target })}** hasn't registered yet! They need to use any economy command first.`));
        }

        const { level, into, needed } = progress(profile.xp);
        const rank = ranking?.rank ?? null;

        // Kartu gambar ala OwO; kalau bot tidak boleh upload file atau kartu gagal dibuat, kirim teks biasa.
        if (canAttach) {
            try {
                const { generateLevelCard } = require('../levelCard');
                const buffer = await generateLevelCard({
                    name: rawName,
                    guildName: message.guild.name,
                    avatarURL,
                    level, rank, xp: into, needed, backgroundBuffer
                });
                return message.channel.send({
                    files: [new AttachmentBuilder(buffer, { name: 'level.png' })],
                    allowedMentions: { parse: [] }
                });
            } catch (error) {
                console.error('[FUNECONOMY] Level card failed:', error.message);
            }
        }

        const targetName = displayName({ member: member ?? message.member, author: target });
        return send(message,
            `${cfg.EMOJI.LEVEL} | **${targetName}** | LVL **${fmt(level)}** | Rank: **${rank ? `#${fmt(rank)}` : '-'}** | XP: **${fmt(into)}/${fmt(needed)}**`);
    }
};