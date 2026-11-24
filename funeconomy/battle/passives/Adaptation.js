/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const PassiveInterface = require('../PassiveInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Stoneskin = require('../buffs/Stoneskin.js');
const Spellskin = require('../buffs/Spellskin.js');
const Log = require('../util/logUtil.js');

/* Menggantikan passive Photosynthesis (id 24 tetap): senjata lama otomatis jadi Adaptation. */
module.exports = class Adaptation extends PassiveInterface {
	init() {
		this.id = 24;
		this.name = 'Adaptation';
		this.basicDesc = 'Adapt to the last damage you received';
		this.emojis = Array(7).fill('🧬');
		this.statDesc =
			'Gains resistance against the last damage type received. Physical hits grant ' + Stoneskin.emojiDefault + ' **Stoneskin**, while Magical hits grant ' + Spellskin.emojiDefault + ' **Spellskin**.';
		this.qualityList = [[5, 14], [4, 10]];
	}

	/* Teks tambahan di deskripsi weapon: penjelasan Stoneskin & Spellskin. */
	get extraDesc() {
		const line = (Buff, pct) => {
			const buff = new Buff(null, [], 0);
			return `${Buff.emojiDefault} **${buff.name}** - ${buff.statDesc.replace('?', pct)}\n-# ${require('../../customEmoji.js').get('stacklimit')} **Stack Limit** - Cannot exceed 5 stacks.`;
		};
		return [line(Stoneskin, this.stats[0]), line(Spellskin, this.stats[1])].join('\n');
	}

	postAttacked(animal, attacker, damage, type, tags) {
		if (animal.stats.hp[0] <= 0 || !(damage > 0)) return;
		let buff, pct;
		if (type == WeaponInterface.PHYSICAL) { buff = new Stoneskin(animal, [], 0); pct = this.stats[0]; }
		else if (type == WeaponInterface.MAGICAL) { buff = new Spellskin(animal, [], 0); pct = this.stats[1]; }
		else return;
		const logs = new Log();
		logs.push(`[ADAPT] ${animal.nickname} adapts and gains ${buff.name}`, buff.addStacks(animal, 1, pct, tags));
		return logs;
	}
};
