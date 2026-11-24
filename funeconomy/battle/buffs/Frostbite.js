/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');
const Freeze = require('./Freeze.js');
const Logs = require('../util/logUtil.js');

const FREEZE_AT = 100;

/* Debuff bertumpuk (stack): di 100 stack memberi Freeze 1 giliran lalu semua stack hilang. */
module.exports = class Frostbite extends BuffInterface {
	init() {
		this.id = 13;
		this.name = 'Frostbite';
		this.debuff = true;
		this.emoji = '❄️';
		this.stacks = 0;
		this.statDesc = 'At 100 stacks, apply a stack of Freeze to the target. Remove all stacks after triggering.';
		this.qualityList = [];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(13) || '❄️';
	}

	/* Tambah stack ke hewan; kalau sudah ada dipakai buff yang lama. */
	addStacks(animal, stacks, tags) {
		const logs = new Logs();
		let buff = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath);
		if (!buff) {
			buff = this;
			buff.stacks = 0;
			logs.push(buff.attemptBind(animal, 99, tags));
		}
		buff.stacks += stacks;
		if (buff.stacks >= FREEZE_AT) {
			buff.stacks = 0;
			buff.markedForDeath = true;
			if (!animal.buffs.some((b) => b.id === 5 && !b.markedForDeath)) {
				const freeze = new Freeze(this.from, [], 1);
				logs.push(`[FROSTBITE] ${animal.nickname} is frozen`);
				logs.push(freeze.attemptBind(animal, 1, tags));
			}
		}
		return logs;
	}

	/* Stack tidak berkurang per giliran */
	postTurn(_animal, _ally, _enemy, _action) {
		if (this.justCreated) this.justCreated = false;
	}
};
