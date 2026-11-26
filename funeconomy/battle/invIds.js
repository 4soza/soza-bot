/*
 * Nomor weapon di inventory (`sinv`, `sw 113`) disamakan dengan OwO.
 * Dicocokkan dari gambar weapon di inventory OwO. Kunci = id weapon di bot, nilai = nomor di inventory.
 * Weapon yang tidak ada di sini memakai id + 100 (cara bawaan OwO).
 */
const INV_IDS = {
	1: 101, 2: 111, 3: 103, 5: 105, 6: 106, 7: 124, 8: 108, 9: 113, 10: 110, 11: 107, 12: 112,
	13: 123, 14: 114, 15: 115, 16: 116, 17: 117, 19: 119, 20: 120, 21: 121,
	23: 129, 24: 127, 25: 102, 26: 128, 27: 109, 28: 125, 29: 126
};
const REVERSE = Object.fromEntries(Object.entries(INV_IDS).map(([wid, inv]) => [inv, Number(wid)]));

/* id weapon -> nomor di inventory */
const invIdOf = (wid) => INV_IDS[wid] || wid + 100;

/* nomor di inventory -> id weapon (undefined kalau tidak ada) */
function widOfInvId(inv) {
	if (REVERSE[inv]) return REVERSE[inv];
	const wid = inv - 100;
	return INV_IDS[wid] ? undefined : wid; // id bawaan yang sudah dipakai weapon lain tidak berlaku lagi
}

module.exports = { INV_IDS, invIdOf, widOfInvId };
