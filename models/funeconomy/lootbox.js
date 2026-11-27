// Based on OwO Bot by Christopher Thai, CC BY-NC-SA 4.0
const mongoose = require('mongoose');

// boxcount = lootbox yang dimiliki. claimcount = jumlah lootbox hasil hunt pada hari claimDay (maks 3 per hari).
const lootboxSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    boxcount: { type: Number, default: 0, min: 0 },
    claimcount: { type: Number, default: 0, min: 0 },
    claimDay: { type: Number, default: -1 },
    // fabled lootbox (floot): hanya berisi gem fabled. Dari hunt, jarang, maksimal 1 per hari.
    fboxcount: { type: Number, default: 0, min: 0 },
    fclaimDay: { type: Number, default: -1 },
    // hadiah event: jumlah hadiah yang sudah didapat pada hari eventDay (maks 10 per hari)
    eventDay: { type: Number, default: -1 },
    eventCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.models.FunLootbox || mongoose.model('FunLootbox', lootboxSchema);
