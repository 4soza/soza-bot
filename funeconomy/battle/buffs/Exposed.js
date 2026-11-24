/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');
const Logs = require('../util/logUtil.js');

/* Debuff bertumpuk: damage berikutnya yang diterima naik 1% per stack, lalu semua stack hilang. */
module.exports = class Exposed extends BuffInterface {
	init() {
		this.id = 14;
		this.name = 'Exposed';
		this.debuff = true;
		this.emoji = '🎯';
		this.stacks = 0;
		this.statDesc = 'The next instance of damage taken will be increased by 1% per stack. Consume all stacks after triggering.';
		this.qualityList = [];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(14) || '🎯';
	}

	addStacks(animal, stacks, tags) {
		const logs = new Logs();
		const buff = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath);
		if (buff) buff.stacks += stacks;
		else {
			this.stacks = stacks;
			logs.push(this.attemptBind(animal, 99, tags));
		}
		return logs;
	}

	attacked(animal, _attacker, damage, _type, _tags) {
		if (this.markedForDeath || !this.stacks) return;
		if (!(damage[0] > 0)) return;
		const bonus = (damage[0] * this.stacks) / 100;
		damage[1] += bonus;
		this.markedForDeath = true;
		const logs = new Logs();
		logs.push(`[EXPOSED] ${animal.nickname} took ${Math.round(bonus)} extra damage (${this.stacks} stacks)`);
		return logs;
	}

	postTurn(_animal, _ally, _enemy, _action) {
		if (this.justCreated) this.justCreated = false;
	}
};
