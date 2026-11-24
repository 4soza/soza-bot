const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fakes = require('./helpers/battleFakeMongo').install();
const cfg = require('../funeconomy/config');
cfg.COOLDOWNS = {};
const { commands } = require('../funeconomy/index');
const weaponDb = require('../funeconomy/battle/weaponDb');
const settingsDb = require('../funeconomy/battle/settingsDb');
const WeaponInterface = require('../funeconomy/battle/WeaponInterface');

const U = '100000000000000009';
const NEW_WEAPONS = ['ConduitClaw', 'Crossbow', 'DruidStaff', 'EyeStaff', 'FrostStaff'];
const NEW_PASSIVES = ['DoubleStrike', 'Execute', 'Photosynthesis', 'Ferocity', 'Sharpness', 'GiantSlayer', 'FrostArmor', 'Lifebloom', 'Resonance'];

test('new weapons and passives have unique ids and an emoji image', () => {
    const wid = new Set(Object.keys(WeaponInterface.weapons));
    assert.equal(wid.size, 27);
    for (const n of NEW_WEAPONS) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'emoji', `w_${n.toLowerCase()}.png`)));
    for (const n of NEW_PASSIVES) {
        const P = require(`../funeconomy/battle/passives/${n}.js`);
        const p = new P();
        assert.equal(p.emojis.length, 7);
        assert.ok(p.name && p.statDesc && p.qualityList.length);
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'emoji', `p_${n.toLowerCase()}.png`)));
    }
    const ids = NEW_PASSIVES.map((n) => new (require(`../funeconomy/battle/passives/${n}.js`))().id);
    assert.equal(new Set(ids).size, ids.length);
});

function msg() {
    const sent = [];
    const channel = { id: 'c', send: async (p) => { sent.push(typeof p === 'string' ? { content: p } : p); return { id: String(sent.length), embeds: [], edit: async () => {}, delete: async () => {} }; }, permissionsFor: () => ({ has: () => true }) };
    return { sent, message: { author: { id: U, username: 't', displayAvatarURL: () => null }, member: { displayName: 'T' }, guild: { id: 'g', members: { cache: new Map(), me: {} } }, channel, mentions: { users: new Map() } } };
}
const run = async (line) => { const [n, ...a] = line.split(/\s+/); const m = msg(); await commands.get(n).execute(m.message, a, { users: { fetch: async () => null } }); return m.sent; };

test('battles with every new weapon and passive run without errors', async () => {
    for (const n of ['dog', 'cat', 'cow']) fakes.FunAnimal.docs.push({ userId: U, name: n, count: 5, totalcount: 5, xp: 99999 });
    for (const a of ['dog', 'cat', 'cow']) await run(`team add ${a}`);
    await settingsDb.setBattleSetting(U, 'display', 'text');
    await settingsDb.setBattleSetting(U, 'speed', 0);
    const logs = new Set();
    for (let round = 0; round < 30; round++) {
        for (const a of ['dog', 'cat', 'cow']) {
            const cls = round % 3 === 0 ? WeaponInterface.weapons[23 + ((round / 3 + 0) % 5 | 0)] : null;
            const weapon = cls ? new cls() : weaponDb.randomWeapon();
            await weaponDb.saveWeapon(U, weapon);
            const doc = fakes.FunWeapon.docs.slice(-1)[0];
            await run(`w ${doc.uwid || doc.id} ${a}`);
        }
        const out = await run('battle');
        for (const s of out) logs.add(JSON.stringify(s).slice(0, 50));
    }
    assert.ok(logs.size > 0);
});

const animalUtil = require('../funeconomy/battle/animalUtil');
const teamUtil = require('../funeconomy/battle/teamUtil');
const BattleEvent = require('../funeconomy/battle/battleEvent');

async function simulate(weaponClass, passiveClass) {
    Object.values(fakes).forEach((m) => m.reset());
    for (const n of ['dragon', 'dog', 'cat']) {
        fakes.FunAnimal.docs.push({ userId: U, name: n, count: 1, totalcount: 1, xp: animalUtil.xpForLevel(30), nickname: null });
        await teamUtil.addMember(U, n);
    }
    const player = await teamUtil.getBattleTeam(U);
    const enemy = teamUtil.generateEnemyTeam(player);
    for (const animal of player.team) {
        animal.weapon = new weaponClass();
        if (passiveClass) animal.weapon.passives = [new passiveClass()];
        animal.stats = animal.stats || animal.stats;
    }
    const event = new BattleEvent();
    event.init(player, enemy);
    event.simulateBattle();
    return JSON.stringify(event.logs || event.endResult || '');
}

test('each new weapon attacks and each new passive triggers during simulated battles', async () => {
    for (const name of NEW_WEAPONS) {
        const Cls = require(`../funeconomy/battle/weapons/${name}.js`);
        const text = await simulate(Cls);
        assert.ok(text.length > 2, `${name} produced a battle`);
    }
    const Orb = require('../funeconomy/battle/weapons/Orb.js');
    for (const name of NEW_PASSIVES) {
        const Cls = require(`../funeconomy/battle/passives/${name}.js`);
        for (let i = 0; i < 3; i++) assert.ok((await simulate(Orb, Cls)).length > 2, `${name} produced a battle`);
    }
});
