/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

/*
 * Id 13, Staff of Corruption seperti OwO (dulu bernama Arcane Scepter, tongkat ungu).
 * Arcane Scepter yang asli ada di id 9. Emoji: w_staffofcorruption_*, wi_staffofcorruption, b?staffofcorruption.
 */
const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');

/* Buff baik yang punya angka efek, jadi bisa dilemahkan */
const corruptible = (animal) =>
	(animal.buffs || []).filter(
		(b) => !b.debuff && !b.markedForDeath && ((b.stats && b.stats.length) || b.pct > 0)
	);

module.exports = class StaffOfCorruption extends WeaponInterface {
	init() {
		this.id = 13;
		this.name = 'Staff of Corruption';
		this.basicDesc = '';
		this.emojis = Array(7).fill('🔮');
		this.pristineEmojis = Array(7).fill('🔮');
		this.defaultEmoji = '🔮';
		this.statDesc = `Reduce the effectiveness of a random enemy's buff to **?%** of its original value, and deal **?%** of your ${WeaponInterface.strEmoji}STR to them.`;
		this.availablePassives = 'all';
		this.passiveCount = 1;
		this.qualityList = [[85, 45], [60, 100]];
		this.manaRange = [220, 130];
	}

	attackWeapon(me, team, enemy) {
		if (me.stats.hp[0] <= 0) return;

		/* No mana */
		if (me.stats.wp[0] < this.manaCost) return this.attackPhysical(me, team, enemy);

		/* Pilih musuh acak yang punya buff baik */
		const targets = enemy.filter((e) => e.stats.hp[0] > 0 && corruptible(e).length);
		if (!targets.length) return this.attackPhysical(me, team, enemy);
		const target = targets[Math.floor(Math.random() * targets.length)];
		const options = corruptible(target);
		const buff = options[Math.floor(Math.random() * options.length)];

		const logs = new Logs();
		const tags = { me, allies: team, enemies: enemy };

		/* deplete weapon points */
		const mana = WeaponInterface.useMana(me, this.manaCost, me, tags);
		const manaLogs = new Logs();
		manaLogs.push(`[CORRUPT] ${me.nickname} used ${mana.amount} WP`, mana.logs);

		/* Lemahkan efek buff: jadi X% dari nilai aslinya (tidak menumpuk, memakai yang terlemah) */
		const factor = this.stats[0] / 100;
		if (!buff.corruptBase) buff.corruptBase = { stats: (buff.stats || []).slice(), pct: buff.pct, factor: 1 };
		if (factor < buff.corruptBase.factor) buff.corruptBase.factor = factor;
		buff.stats = buff.corruptBase.stats.map((v) => Math.round(v * buff.corruptBase.factor * 100) / 100);
		if (buff.pct > 0) buff.pct = Math.round(buff.corruptBase.pct * buff.corruptBase.factor * 100) / 100;

		/* Damage fisik berdasarkan STR */
		let damage = WeaponInterface.getDamage(me.stats.str, this.stats[1] / 100);
		damage = WeaponInterface.inflictDamage(me, target, damage, WeaponInterface.PHYSICAL, tags);
		logs.push(
			`[CORRUPT] ${me.nickname} weakened ${target.nickname}'s ${buff.name} to ${this.stats[0]}% and damaged for ${damage.amount} HP`,
			damage.logs
		);

		logs.addSubLogs(manaLogs);
		return logs;
	}
};
