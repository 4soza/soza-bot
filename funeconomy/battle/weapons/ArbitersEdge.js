/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const WeaponInterface = require('../WeaponInterface.js');
const Sin = require('../buffs/Sin.js');
const Virtue = require('../buffs/Virtue.js');
const Tags = require('../util/tags.js');
const Logs = require('../util/logUtil.js');

const total = (stat) => stat[0] + stat[1];

module.exports = class ArbitersEdge extends WeaponInterface {
	init() {
		this.id = 29;
		this.name = "Arbiter's Edge";
		this.basicDesc = '';
		this.emojis = Array(7).fill('⚖️');
		this.pristineEmojis = Array(7).fill('⚖️');
		this.defaultEmoji = '⚖️';
		this.statDesc =
			`Unleash judgement upon an enemy. Consume all stacks of ${Sin.emojiDefault} **Sin** and ${Virtue.emojiDefault} **Virtue**. ` +
			`Gain a stack of ${Sin.emojiDefault} **Sin** when an ally deals damage to an animal. ` +
			`Gain a stack of ${Virtue.emojiDefault} **Virtue** when an ally heals or replenishes an animal.`;
		this.availablePassives = 'all';
		this.passiveCount = 1;
		this.qualityList = [];
		this.manaRange = [250, 120];
		this.buffList = [21, 22];
	}

	/* Dipanggil dari WeaponInterface.inflictDamage saat sekutu memberi damage */
	allyDealtDamage(owner, _dealer, _target, amount, tags) {
		if (!(amount > 0) || tags.has('arbiter', owner)) return;
		const [sin] = this.getBuffs(owner);
		const logs = new Logs();
		logs.push(`[ARBITER] ${owner.nickname} gained a stack of Sin`, sin.addStacks(owner, 1, tags));
		return logs;
	}

	/* Dipanggil dari WeaponInterface.heal / replenish saat sekutu menyembuhkan atau mengisi WP */
	allyHealed(owner, _healer, _target, amount, tags) {
		if (!(amount > 0) || tags.has('arbiter', owner)) return;
		const virtue = this.getBuffs(owner)[1];
		const logs = new Logs();
		logs.push(`[ARBITER] ${owner.nickname} gained a stack of Virtue`, virtue.addStacks(owner, 1, tags));
		return logs;
	}

	attackWeapon(me, team, enemy) {
		if (me.stats.hp[0] <= 0) return;

		const sin = me.buffs.find((b) => b.id === 21 && !b.markedForDeath);
		const virtue = me.buffs.find((b) => b.id === 22 && !b.markedForDeath);
		const sinStacks = sin?.stacks || 0;
		const virtueStacks = virtue?.stacks || 0;

		/* Tidak ada stack atau tidak cukup WP: serangan biasa */
		if (!(sinStacks + virtueStacks) || me.stats.wp[0] < this.manaCost) return this.attackPhysical(me, team, enemy);

		let target = WeaponInterface.getAttacking(me, team, enemy);
		if (!target) return;

		const logs = new Logs();
		const tags = new Tags({ me, allies: team, enemies: enemy }).copyAdd('arbiter', me);

		/* deplete weapon points */
		const mana = WeaponInterface.useMana(me, this.manaCost, me, tags);
		const manaLogs = new Logs();
		manaLogs.push(`[ARBITER] ${me.nickname} used ${mana.amount} WP`, mana.logs);

		const highest = total(me.stats.str) >= total(me.stats.mag) ? me.stats.str : me.stats.mag;
		const lowest = highest === me.stats.str ? me.stats.mag : me.stats.str;

		/* Konsumsi semua stack */
		for (const buff of [sin, virtue]) {
			if (!buff) continue;
			buff.stacks = 0;
			buff.markedForDeath = true;
		}

		if (sinStacks) {
			const base = WeaponInterface.getDamage(highest, (sinStacks * sin.stats[0]) / 100);
			const damage = WeaponInterface.inflictDamage(me, target, base, WeaponInterface.PHYSICAL, tags);
			logs.push(`[ARBITER] ${me.nickname} consumed ${sinStacks} Sin and dealt ${damage.amount} physical damage to ${target.nickname}`, damage.logs);
		}
		if (virtueStacks) {
			if (target.stats.hp[0] <= 0) target = WeaponInterface.getAttacking(me, team, enemy);
			if (target) {
				const base = WeaponInterface.getDamage(lowest, (virtueStacks * virtue.stats[0]) / 100);
				const damage = WeaponInterface.inflictDamage(me, target, base, WeaponInterface.MAGICAL, tags);
				logs.push(`[ARBITER] ${me.nickname} consumed ${virtueStacks} Virtue and dealt ${damage.amount} magical damage to ${target.nickname}`, damage.logs);
			}
		}

		logs.addSubLogs(manaLogs);
		return logs;
	}
};
