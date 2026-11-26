/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const BuffInterface = require('../BuffInterface.js');
const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');

/* Id buff yang termasuk "Defense Buff": tidak bisa dipasang kalau hewan sudah punya salah satunya. */
const DEFENSE_BUFFS = [4, 20];

/* Dari Briar-Heart Staff: pemilik weapon menanggung sebagian damage yang diterima hewan ini, tapi juga mengambil sebagian heal dan replenish-nya. */
module.exports = class ThornTether extends BuffInterface {
	init() {
		this.id = 20;
		this.name = 'Thorn Tether';
		this.debuff = false;
		this.emoji = '🌿';
		this.statDesc =
			'Create a tether from the weapon owner to this animal. The owner absorbs **-?%** of the incoming damage dealt, but also intercepts **-?%** of healing and **-?%** replenishing from the target.\n' +
			`-# ${require('../../customEmoji.js').get('shield')} **Defense Buff** - Cannot be applied if the animal already has a defense buff.`;
		this.qualityList = [[20, 45], [15, 40], [10, 35]];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(20) || '🌿';
	}

	static get DEFENSE_BUFFS() {
		return DEFENSE_BUFFS;
	}

	// Override
	bind(animal, duration, tags) {
		if (!this.from || animal.pid === this.from.pid) return; // tidak ada tether ke diri sendiri
		const mine = animal.buffs.find((b) => b.id === this.id && !b.markedForDeath && b.from?.pid === this.from.pid);
		if (mine) {
			mine.duration = Math.max(mine.duration, duration); // pasang ulang = perpanjang
			return;
		}
		if (animal.buffs.some((b) => !b.markedForDeath && DEFENSE_BUFFS.includes(b.id))) return;
		super.bind(animal, duration, tags);
	}

	attacked(animal, _attacker, damage, _type, _tags) {
		const owner = this.from;
		if (this.markedForDeath || !owner || owner.stats.hp[0] <= 0) return;
		const total = damage[0] + damage[1];
		if (!(total > 0)) return;
		const amount = (total * this.stats[0]) / 100;
		damage[1] -= amount;
		owner.stats.hp[0] = Math.max(0, owner.stats.hp[0] - amount);
		const logs = new Logs();
		logs.push(`[TETHER] ${owner.nickname} absorbed ${Math.round(amount)} damage for ${animal.nickname}`);
		return logs;
	}

	healed(animal, _healer, amount, tags) {
		const owner = this.from;
		if (this.markedForDeath || !owner || owner.stats.hp[0] <= 0) return;
		const total = amount[0] + amount[1];
		if (!(total > 0)) return;
		const taken = (total * this.stats[1]) / 100;
		amount[1] -= taken;
		const logs = new Logs();
		const result = WeaponInterface.heal(owner, taken, owner, tags.copyAdd('tether', owner));
		logs.push(`[TETHER] ${owner.nickname} intercepted ${Math.round(taken)} healing from ${animal.nickname}`, result.logs);
		return logs;
	}

	replenished(animal, _healer, amount, tags) {
		const owner = this.from;
		if (this.markedForDeath || !owner || owner.stats.hp[0] <= 0) return;
		const total = amount[0] + amount[1];
		if (!(total > 0)) return;
		const taken = (total * this.stats[2]) / 100;
		amount[1] -= taken;
		const logs = new Logs();
		const result = WeaponInterface.replenish(owner, taken, owner, tags.copyAdd('tether', owner));
		logs.push(`[TETHER] ${owner.nickname} intercepted ${Math.round(taken)} WP from ${animal.nickname}`, result.logs);
		return logs;
	}
};
