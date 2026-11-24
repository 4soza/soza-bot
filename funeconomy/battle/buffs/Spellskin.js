/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');

const STACK_LIMIT = 5;

/* Buff bertumpuk dari passive Adaptation: kurangi damage Magical yang masuk per stack, hilang semua kalau kena damage tipe lain. */
module.exports = class Spellskin extends BuffInterface {
	init() {
		this.id = 18;
		this.name = 'Spellskin';
		this.debuff = false;
		this.emoji = '🔮';
		this.stacks = 0;
		this.pct = 0;
		this.statDesc = 'Reduces incoming Magical damage by **?%** per stack. Remove all stacks upon taking damage of other types.';
		this.qualityList = [];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(18) || '🔮';
	}

	/* Tambah stack (maks 5) dengan persentase per stack dari passive pemberi. */
	addStacks(animal, stacks, pct, tags) {
		const logs = new Logs();
		let buff = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath);
		if (!buff) {
			buff = this;
			buff.stacks = 0;
			logs.push(buff.attemptBind(animal, 99, tags));
		}
		buff.pct = pct;
		buff.stacks = Math.min(STACK_LIMIT, buff.stacks + stacks);
		return logs;
	}

	attacked(animal, _attacker, damage, type, _tags) {
		if (this.markedForDeath || !this.stacks) return;
		if (!(damage[0] > 0)) return;
		const logs = new Logs();
		if (type == WeaponInterface.MAGICAL) {
			const less = (damage[0] * this.pct * this.stacks) / 100;
			damage[1] -= less;
			logs.push(`[SPELLSKIN] ${animal.nickname} took ${Math.round(less)} less damage (${this.stacks} stacks)`);
		} else {
			this.markedForDeath = true;
			logs.push(`[SPELLSKIN] ${animal.nickname} lost Spellskin`);
		}
		return logs;
	}

	/* Stack tidak berkurang per giliran */
	postTurn(_animal, _ally, _enemy, _action) {
		if (this.justCreated) this.justCreated = false;
	}
};
