/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const PassiveInterface = require('../PassiveInterface.js');
const Log = require('../util/logUtil.js');
const Frostbite = require('../buffs/Frostbite.js');
const Freeze = require('../buffs/Freeze.js');

/* Menggantikan passive Tide (id 25), jadi senjata lama dengan Tide otomatis memakai Frost Armor. */
module.exports = class FrostArmor extends PassiveInterface {
	init() {
		this.id = 25;
		this.name = 'Frost Armor';
		this.basicDesc = 'A cold shell freezes whoever hits you';
		this.emojis = Array(7).fill('❄️');
		this.statDesc =
			'When you receive damage, apply **?** stacks of ' + Frostbite.emojiDefault + ' **Frostbite** to the attacker.\n' +
			'> ' + Frostbite.emojiDefault + ' **Frostbite** - At 100 stacks, apply a stack of ' + Freeze.emojiDefault + ' **Freeze** to the target. Remove all stacks after triggering.\n' +
			'> ' + Freeze.emojiDefault + ' **Freeze** - Next turn, prevent the target from attacking. Remove a stack after triggering.';
		this.qualityList = [[10, 20]];
	}

	postAttacked(animal, attacker, _totalDamage, _type, tags) {
		if (animal.stats.hp[0] <= 0) return;
		if (!attacker || attacker.stats.hp[0] <= 0) return;
		const stacks = this.stats[0];
		if (!(stacks > 0)) return;

		const buff = new Frostbite(animal, [], 99);
		const logs = new Log();
		logs.push(`[FROSTARMOR] ${animal.nickname} applied ${Math.round(stacks)} stacks of Frostbite to ${attacker.nickname}`);
		logs.addSubLogs(buff.addStacks(attacker, stacks, tags));
		return logs;
	}
};
