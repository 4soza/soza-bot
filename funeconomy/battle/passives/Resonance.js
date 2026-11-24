/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

// Resonance: id passive 29, emoji p_resonance_*.
const PassiveInterface = require('../PassiveInterface.js');
const Log = require('../util/logUtil.js');

const countBuffs = (animal, debuff) => (animal.buffs || []).filter((b) => !b.markedForDeath && !!b.debuff === debuff).length;

module.exports = class Resonance extends PassiveInterface {
	init() {
		this.id = 29;
		this.name = 'Resonance';
		this.aliases = ['reso'];
		this.basicDesc = 'Stronger with buffs, tougher with debuffs';
		this.emojis = Array(7).fill('🔔');
		this.statDesc =
			'For every buff you have, deal **?%** more damage. For every debuff you have, take **?%** less damage.';
		this.qualityList = [[3, 10], [3, 10]];
	}

	attack(animal, attackee, damage, _type, _tags) {
		const buffs = countBuffs(animal, false);
		if (!buffs) return;
		const extra = (damage[0] * this.stats[0] * buffs) / 100;
		if (extra < 1) return;
		damage[1] += extra;
		const logs = new Log();
		logs.push(`[RESO] ${animal.nickname} dealt ${Math.round(extra)} extra damage from ${buffs} buff(s)`);
		return logs;
	}

	attacked(animal, _attacker, damage, _type, _tags) {
		const debuffs = countBuffs(animal, true);
		if (!debuffs) return;
		const less = Math.min(Math.max(damage[1], 0), (damage[0] * this.stats[1] * debuffs) / 100);
		if (less < 1) return;
		damage[1] -= less;
		const logs = new Log();
		logs.push(`[RESO] ${animal.nickname} took ${Math.round(less)} less damage from ${debuffs} debuff(s)`);
		return logs;
	}
};
