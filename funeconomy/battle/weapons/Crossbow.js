/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 * New weapon/passive designed for this bot (uses OwO's weapon framework).
 */

const WeaponInterface = require('../WeaponInterface.js');
const Logs = require('../util/logUtil.js');
const HeavyArrow = require('../buffs/HeavyArrow.js');
const Exposed = require('../buffs/Exposed.js');

const EXPOSED_STACKS = 20;

module.exports = class Crossbow extends WeaponInterface {
	init() {
		this.id = 24;
		this.name = 'Crossbow';
		this.basicDesc = 'A heavy crossbow that loads a powerful arrow';
		this.emojis = Array(7).fill('🎯');
		this.pristineEmojis = Array(7).fill('🎯');
		this.defaultEmoji = '🎯';
		this.statDesc =
			'If ' + HeavyArrow.emojiDefault + ' **Heavy Arrow** is not loaded, load one. Otherwise, consume it. Loading an arrow does not cost WP.\n' +
			'> ' + HeavyArrow.emojiDefault + ' **Heavy Arrow** - When consumed, deal **?%** of your ' + WeaponInterface.strEmoji + 'STR and apply **' + EXPOSED_STACKS + '** stacks of ' + Exposed.emojiDefault + ' **Exposed** to an enemy.\n' +
			'> ' + Exposed.emojiDefault + ' **Exposed** - The next instance of damage taken will be increased by 1% per stack. Consume all stacks after triggering.';
		this.availablePassives = 'all';
		this.passiveCount = 1;
		this.qualityList = [[200, 300]];
		this.manaRange = [220, 120];
	}

	attackWeapon(me, team, enemy) {
		if (me.stats.hp[0] <= 0) return;

		const loaded = me.buffs.find((b) => b.id === HeavyArrow.getID && !b.markedForDeath);

		/* Belum ada anak panah: pasang satu (tanpa WP) */
		if (!loaded) {
			const arrow = new HeavyArrow(me, [], 99);
			const logs = new Logs();
			logs.push(`[XBOW] ${me.nickname} loaded a Heavy Arrow`);
			logs.addSubLogs(arrow.attemptBind(me, 99, { me, allies: team, enemies: enemy }));
			return logs;
		}

		/* No mana: anak panah tetap terpasang */
		if (me.stats.wp[0] < this.manaCost) return this.attackPhysical(me, team, enemy);

		const attacking = WeaponInterface.getAttacking(me, team, enemy);
		if (!attacking) return this.attackPhysical(me, team, enemy);

		const logs = new Logs();
		loaded.markedForDeath = true;

		/* deplete weapon points*/
		const mana = WeaponInterface.useMana(me, this.manaCost, me, { me, allies: team, enemies: enemy });
		const manaLogs = new Logs();
		manaLogs.push(`[XBOW] ${me.nickname} used ${mana.amount} WP`, mana.logs);

		let damage = WeaponInterface.getDamage(me.stats.att, this.stats[0] / 100);
		damage = WeaponInterface.inflictDamage(me, attacking, damage, WeaponInterface.PHYSICAL, { me, allies: team, enemies: enemy });
		logs.push(`[XBOW] ${me.nickname} shot ${attacking.nickname} with a Heavy Arrow for ${damage.amount} HP`, damage.logs);

		if (attacking.stats.hp[0] > 0) {
			const exposed = new Exposed(me, [], 99);
			logs.addSubLogs(exposed.addStacks(attacking, EXPOSED_STACKS, { me, allies: team, enemies: enemy }));
		}

		logs.addSubLogs(manaLogs);
		return logs;
	}
};
