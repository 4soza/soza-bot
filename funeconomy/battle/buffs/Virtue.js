/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const BuffInterface = require('../BuffInterface.js');
const Logs = require('../util/logUtil.js');

const STACK_LIMIT = 10;

/* Buff bertumpuk dari Arbiter's Edge: dikonsumsi saat weapon dipakai, tiap stack memberi damage magical. */
module.exports = class Virtue extends BuffInterface {
	init() {
		this.id = 22;
		this.name = 'Virtue';
		this.debuff = false;
		this.emoji = '💧';
		this.stacks = 0;
		this.statDesc =
			'When consumed, each stack deals **?%** of your ' + require('../../customEmoji.js').get('attmag') + ' **lowest** offense stat as magical damage to an enemy.\n' +
			`-# ${require('../../customEmoji.js').get('stacklimit')} **Stack Limit** - Cannot exceed ${STACK_LIMIT} stacks.`;
		this.qualityList = [[15, 40]];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(22) || '💧';
	}

	/* Tambah stack ke hewan (maks 10); kalau sudah punya, stack ditambahkan ke buff yang lama. */
	addStacks(animal, stacks, tags) {
		const logs = new Logs();
		let buff = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath);
		if (!buff) {
			buff = this;
			buff.stacks = 0;
			logs.push(buff.attemptBind(animal, 99, tags));
		}
		buff.stacks = Math.min(STACK_LIMIT, buff.stacks + stacks);
		return logs;
	}

	/* Stack tidak berkurang per giliran */
	postTurn(_animal, _ally, _enemy, _action) {
		if (this.justCreated) this.justCreated = false;
	}
};
