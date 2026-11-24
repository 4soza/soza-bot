/*
 * Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
 * (https://github.com/ChristopherBThai/Discord-OwO-Bot), adapted for this bot.
 */

const BuffInterface = require('../BuffInterface.js');

/* Penanda anak panah yang sudah terpasang di Crossbow (dipakai di serangan berikutnya). */
module.exports = class HeavyArrow extends BuffInterface {
	init() {
		this.id = 15;
		this.name = 'Heavy Arrow';
		this.emoji = '🏹';
		this.statDesc = 'A heavy arrow is loaded in your crossbow.';
		this.qualityList = [];
	}

	static get emojiDefault() {
		return require('../../customEmoji.js').buff(15) || '🏹';
	}

	postTurn(_animal, _ally, _enemy, _action) {
		if (this.justCreated) this.justCreated = false;
	}
};
