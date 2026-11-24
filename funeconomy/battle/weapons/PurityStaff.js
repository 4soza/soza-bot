/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');

module.exports = class PStaff extends WeaponInterface {
	init() {
		this.id = 19;
		this.name = 'Staff of Purity';
		this.basicDesc = '';
		this.emojis = Array(7).fill('💧');
		this.pristineEmojis = Array(7).fill('💧');
		this.defaultEmoji = '💧';
		this.statDesc = `Remove a debuff from a random ally and heal them for **?%** of your ${WeaponInterface.magEmoji}MAG and apply 1 stack of **Sacred Ward** for 2 turns.`;
		this.availablePassives = 'all';
		this.passiveCount = 1;
		this.buffList = [16];
		this.qualityList = [[30, 80]];
		this.manaRange = [200, 125];
	}

	attackWeapon(me, team, enemy) {
		if (me.stats.hp[0] <= 0) return;

		/* No mana */
		if (me.stats.wp[0] < this.manaCost) return this.attackPhysical(me, team, enemy);

		/* Prefer an ally with a debuff, otherwise any living ally still gets healed and warded */
		let ally = WeaponInterface.getRandomAnimal(team, { hasDebuff: true, isAlive: true });
		if (!ally) ally = WeaponInterface.getRandomAnimal(team, { isAlive: true });
		if (!ally) return this.attackPhysical(me, team, enemy);

		let logs = new Logs();
		const tags = { me, allies: team, enemies: enemy };

		/* deplete weapon points */
		let mana = WeaponInterface.useMana(me, this.manaCost, me, tags);
		let manaLogs = new Logs();
		manaLogs.push(`[PSTAFF] ${me.nickname} used ${mana.amount} WP`, mana.logs);
		logs.addSubLogs(manaLogs);

		/* Remove a debuff from the ally */
		const index = ally.buffs.findIndex((b) => b.debuff && !b.markedForDeath);
		let removed = '';
		if (index >= 0) {
			const [removedBuff] = ally.buffs.splice(index, 1);
			removed = `removed ${removedBuff.name} from ${ally.nickname}, `;
		}

		/* Heal */
		let heal = WeaponInterface.getDamage(me.stats.mag, this.stats[0] / 100);
		heal = WeaponInterface.heal(ally, heal, me, tags);
		logs.push(`[PSTAFF] ${me.nickname} ${removed}healed ${ally.nickname} for ${heal.amount} HP`, heal.logs);

		/* Sacred Ward: 1 stack for 2 turns */
		const ward = this.getBuffs(me)[0];
		const wardLogs = new Logs();
		wardLogs.push(ward.addStack(ally, 2, tags));
		logs.push(`[PSTAFF] ${me.nickname} applied Sacred Ward to ${ally.nickname}`);
		logs.addSubLogs(wardLogs);

		return logs;
	}
};
