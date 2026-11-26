/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const WeaponInterface = require('../WeaponInterface.js');
const ThornTether = require('../buffs/ThornTether.js');
const Logs = require('../util/logUtil.js');
const battleUtil = require('../util/battleUtil.js');

module.exports = class BriarHeartStaff extends WeaponInterface {
	init() {
		this.id = 28;
		this.name = 'Briar-Heart Staff';
		this.basicDesc = '';
		this.emojis = Array(7).fill('🌿');
		this.pristineEmojis = Array(7).fill('🌿');
		this.defaultEmoji = '🌿';
		this.statDesc = `At the start of the turn, apply ${ThornTether.emojiDefault} **Thorn Tether** to your allies for 2 turns.`;
		this.availablePassives = 'all';
		this.passiveCount = 1;
		this.qualityList = [];
		this.manaRange = [240, 140];
		this.buffList = [20];
	}

	preTurn(animal, ally, enemy, action) {
		this.justCast = false;
		if (action != battleUtil.weapon) return;
		if (animal.disabled && !animal.disabled.canAttack) return;
		if (animal.stats.hp[0] <= 0) return;
		if (animal.stats.wp[0] < this.manaCost) return;

		/* Sekutu yang belum punya tether dari kita (atau tether-nya hampir habis) */
		const needs = ally.filter((a) => {
			if (a.pid === animal.pid || a.stats.hp[0] <= 0) return false;
			const mine = a.buffs.find((b) => b.id === 20 && !b.markedForDeath && b.from?.pid === animal.pid);
			if (mine) return mine.duration <= 1;
			return !a.buffs.some((b) => !b.markedForDeath && ThornTether.DEFENSE_BUFFS.includes(b.id));
		});
		if (!needs.length) return;

		const logs = new Logs();
		const buffLogs = new Logs();
		for (const target of needs) {
			const buff = this.getBuffs(animal)[0];
			buffLogs.push(buff.attemptBind(target, 3, { me: target, allies: ally, enemies: enemy }));
		}
		this.justCast = true;
		logs.push(`[BRIAR] ${animal.nickname} applied Thorn Tether to ${needs.length} ally(ies)`);

		/* deplete weapon points */
		const mana = WeaponInterface.useMana(animal, this.manaCost, animal, { me: animal, allies: ally, enemies: enemy });
		const manaLogs = new Logs();
		manaLogs.push(`[BRIAR] ${animal.nickname} used ${mana.amount} WP`, mana.logs);

		logs.addSubLogs(buffLogs);
		logs.addSubLogs(manaLogs);
		return logs;
	}

	attackWeapon(me, team, enemy) {
		/* Tidak menyerang kalau baru memakai kemampuan */
		if (this.justCast) {
			this.justCast = false;
			return;
		}
		return this.attackPhysical(me, team, enemy);
	}
};
