/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Tags = require('../util/tags.js');
const Logs = require('../util/logUtil.js');

/* Debuff bertumpuk dari passive Living Hive: di akhir giliran tiap stack memberi damage magic lalu semua stack hilang. */
module.exports = class Pest extends BuffInterface {
	init() {
		this.id = 19;
		this.name = 'Pest';
		this.debuff = true;
		this.emoji = '🐛';
		this.stacks = 0;
		this.pct = 0;
		this.statDesc =
			'At the end of the turn, each stack of pests will deal **?%** of your ' +
			WeaponInterface.magEmoji +
			'MAG as magical damage to the target. Pests will leave after they deal damage.';
		this.qualityList = [];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(19) || '🐛';
	}

	/* Tambah stack ke hewan. Pest dari pemberi yang sama digabung jadi satu buff. */
	addStacks(animal, stacks, pct, tags) {
		const logs = new Logs();
		let buff = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath && b.from?.pid === this.from?.pid);
		if (!buff) {
			buff = this;
			buff.stacks = 0;
			logs.push(buff.attemptBind(animal, 99, tags));
		}
		buff.pct = pct;
		buff.stacks += stacks;
		return logs;
	}

	postTurn(animal, ally, enemy, _action) {
		if (this.justCreated) this.justCreated = false;
		if (this.markedForDeath) return;
		this.markedForDeath = true; // pest hilang setelah memberi damage
		if (!this.from || !this.stacks || animal.stats.hp[0] <= 0) return;

		const logs = new Logs();
		let damage = WeaponInterface.getDamage(this.from.stats.mag, (this.pct * this.stacks) / 100);
		const tags = new Tags({ me: this.from, allies: enemy, enemies: ally }).copyAdd('pest', this.from);
		damage = WeaponInterface.inflictDamage(this.from, animal, damage, WeaponInterface.MAGICAL, tags);
		logs.push(
			`[PEST] ${this.from.nickname}'s ${this.stacks} pest(s) damaged ${animal.nickname} for ${damage.amount} HP`,
			damage.logs
		);
		return logs;
	}
};
