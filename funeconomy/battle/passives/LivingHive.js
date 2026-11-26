/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

/*
 * Passive id 30, Living Hive (seperti OwO), dulu bernama Lifebloom. Emoji: p_livinghive_*.
 */
const PassiveInterface = require('../PassiveInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Pest = require('../buffs/Pest.js');
const Log = require('../util/logUtil.js');

module.exports = class LivingHive extends PassiveInterface {
	init() {
		this.id = 30;
		this.name = 'Living Hive';
		this.aliases = ['hive', 'lifebloom'];
		this.basicDesc = 'Your attacks infest enemies with pests';
		this.emojis = Array(7).fill('🐝');
		this.statDesc =
			'When dealing damage, spend **?** ' + WeaponInterface.wpEmoji + 'WP to apply ' + Pest.emojiDefault + ' **Pest** to the target.\n' +
			'> ' + Pest.emojiDefault + ' **Pest** - At the end of the turn, each stack of pests will deal **?%** of your ' +
			WeaponInterface.magEmoji + 'MAG as magical damage to the target. Pests will leave after they deal damage.';
		this.qualityList = [[6, 3], [3, 6]];
	}

	postAttack(animal, attackee, totalDamage, _type, tags) {
		if (tags.has('pest', animal) || animal.stats.hp[0] <= 0) return;
		if (!attackee || attackee.stats.hp[0] <= 0 || !(totalDamage > 0)) return;
		const cost = this.stats[0];
		if (animal.stats.wp[0] < cost) return;

		const mana = WeaponInterface.useMana(animal, cost, animal, tags);
		const buff = new Pest(animal, [], 99);
		const logs = new Log();
		logs.push(`[HIVE] ${animal.nickname} spent ${mana.amount} WP to apply Pest to ${attackee.nickname}`, mana.logs);
		logs.addSubLogs(buff.addStacks(attackee, 1, this.stats[1], tags));
		return logs;
	}
};
