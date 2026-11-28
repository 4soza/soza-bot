/*
 * Nama hewan / nama tim boleh berisi emoji biasa maupun custom emoji (termasuk animasi, <a:nama:id>).
 * Token custom emoji harus utuh, jadi dijaga saat membersihkan, menghitung panjang, dan memotong teks.
 */
const EMOJI = /<a?:\w{2,32}:\d{17,20}>/;
const SPLIT = new RegExp(`(${EMOJI.source})`);
const isEmoji = (part) => new RegExp(`^${EMOJI.source}$`).test(part);

/* Bersihkan teks, tapi custom emoji dibiarkan utuh. `clean` membersihkan bagian selain emoji. */
function cleanKeepingEmoji(text, clean) {
	return String(text).split(SPLIT).map((part, i) => (i % 2 ? part : clean(part))).join('');
}

/* Panjang yang terlihat: satu custom emoji dihitung 2 karakter, bukan 30+. */
function visibleLength(text) {
	return String(text).split(SPLIT).reduce((n, part, i) => n + (i % 2 ? 2 : part.length), 0);
}

/* Potong sampai `max` karakter tanpa memotong token emoji di tengah. */
function safeSlice(text, max) {
	text = String(text);
	if (text.length <= max) return text;
	let out = '';
	for (const [i, part] of text.split(SPLIT).entries()) {
		if (i % 2 === 0) {
			if (out.length + part.length > max) return out + part.slice(0, max - out.length);
			out += part;
		} else {
			if (out.length + part.length > max) return out;
			out += part;
		}
	}
	return out;
}

/* Untuk tempat yang tidak bisa menampilkan emoji (label menu pilihan): <a:nama:id> jadi :nama: */
const plainText = (text) => String(text).replace(new RegExp(EMOJI.source, 'g'), (m) => `:${m.split(':')[1]}:`);

/*
 * Tanpa Nitro, Discord mengirim emoji custom sebagai teks ":nama:" (tanpa ID).
 * Di sini ":nama:" dicarikan emoji bernama sama di semua server tempat bot berada (dan emoji aplikasi bot),
 * lalu diganti jadi <:nama:id> / <a:nama:id>. Kalau tidak ditemukan, teks dibiarkan apa adanya.
 */
function resolveShortcodes(text, client) {
	const pools = [client?.emojis?.cache, client?.application?.emojis?.cache].filter(Boolean);
	if (!pools.length) return String(text);
	return String(text).split(SPLIT).map((part, i) => (i % 2 ? part : part.replace(/:([A-Za-z0-9_]{2,32}):/g, (match, name) => {
		for (const pool of pools) {
			const found = pool.find((e) => e.name === name && e.available !== false);
			if (found) return `<${found.animated ? 'a' : ''}:${found.name}:${found.id}>`;
		}
		return match;
	}))).join('');
}

module.exports = { resolveShortcodes, cleanKeepingEmoji, visibleLength, safeSlice, plainText, isEmoji };
