/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');

/* Buff bertumpuk: mencegah debuff masuk. Tiap debuff yang dicegah memakai 1 stack dan mengisi WP hewan ini. */
module.exports = class SacredWard extends BuffInterface {
	init() {
		this.id = 16;
		this.name = 'Sacred Ward';
		this.debuff = false;
		this.emoji = '✨';
		this.stacks = 1;
		this.statDesc = `Prevents any debuffs to be applied to this animal. On success, remove a stack and replenish **?%** ${WeaponInterface.magEmoji}MAG to the animal.`;
		this.qualityList = [[15, 30]];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(16) || '✨';
	}

	/* Hewan sudah punya Sacred Ward: tambah stack di buff lama (durasi disegarkan), kalau belum pasang yang baru. */
	addStack(animal, duration, tags) {
		const logs = new Logs();
		const old = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath);
		if (old) {
			old.stacks += 1;
			old.duration = Math.max(old.duration, duration);
			old.stats = this.stats;
			old.from = this.from;
		} else {
			this.stacks = 1;
			logs.push(this.attemptBind(animal, duration, tags));
		}
		return logs;
	}

	// Override
	preBind(animal, duration, tags, buffToAdd) {
		if (buffToAdd === this || this.markedForDeath || this.stacks <= 0) return;
		if (!buffToAdd.debuff) return;

		const logs = new Logs();
		this.stacks -= 1;
		if (this.stacks <= 0) this.markedForDeath = true;

		let amount = WeaponInterface.getDamage(this.from.stats.mag, this.stats[0] / 100);
		const replenish = WeaponInterface.replenish(animal, amount, this.from, tags);
		logs.push(
			`[SWARD] Prevented ${buffToAdd.name} and replenished ${replenish.amount} WP to ${animal.nickname}`,
			replenish.logs
		);
		return { logs, dontBind: true };
	}
};
