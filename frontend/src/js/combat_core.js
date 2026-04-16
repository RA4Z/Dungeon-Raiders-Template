// frontend/src/js/combat_core.js

window.combatants = [];

window.enterDungeon = async function () {
    setView('combat-screen');
    document.getElementById('combat-dialogue').innerText = "Você adentra a caverna... preparando o campo de batalha.";
    window.updateHUD();

    renderCombatHotbar();
    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;

    document.getElementById('player-hud-avatar-layers').innerHTML = '';
    document.getElementById('player-hud-avatar-img').src = '';

    await buildBattleCharacter(window.activePlayer, 'f', 'player-hud-avatar-img', 'player-hud-avatar-layers');
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    await spawnEnemies();
}

async function spawnEnemies() {
    window.currentEnemies = [];
    window.combatants = [];

    const numEnemies = Math.floor(Math.random() * window.MAX_ENEMIES_IN_COMBAT) + 1;

    const hudContainer = document.getElementById('enemies-hud-container');
    const battleContainer = document.getElementById('enemies-battlefield-container');
    hudContainer.innerHTML = '';
    battleContainer.innerHTML = '';

    let names = [];

    window.combatants.push({
        id: 'player',
        isPlayer: true,
        name: window.activePlayer.name,
        dex: window.playerFullStats.base.des,
        actionValue: 0,
        isDead: false
    });

    for (let i = 0; i < numEnemies; i++) {
        const enemyData = await window.pywebview.api.get_random_enemy();
        const enemyStats = await window.pywebview.api.load_enemy_full_stats(enemyData.id);

        let enemyObj = {
            index: i, id: enemyData.id, data: enemyData, stats: enemyStats,
            hp: enemyStats.computed.hp, mana: enemyStats.computed.mana, stamina: enemyStats.computed.stamina, isDead: false
        };
        window.currentEnemies.push(enemyObj);
        names.push(enemyData.name);

        window.combatants.push({
            id: i, isPlayer: false, name: enemyData.name, dex: enemyStats.base.des, actionValue: 0, isDead: false
        });

        // HTML do inimigo gerado, AGORA COM A BARRA ACT INCLUSA
        hudContainer.innerHTML += `
            <div class="combat-stat-block enemy-stat" id="enemy-hud-block-${i}" onclick="window.setCombatTarget(${i})">
                <div style="flex:1;">
                    <span class="enemy-name-ui">${enemyData.name}</span>
                    <div class="bar-container"><span class="bar-label">HP</span><div class="bar-bg"><div id="enemy-hp-fill-${i}" class="bar-fill hp-fill"></div></div></div>
                    <div class="bar-container"><span class="bar-label">MP</span><div class="bar-bg"><div id="enemy-mp-fill-${i}" class="bar-fill mp-fill"></div></div></div>
                    <div class="bar-container"><span class="bar-label">SP</span><div class="bar-bg"><div id="enemy-sp-fill-${i}" class="bar-fill sp-fill"></div></div></div>
                    <div class="bar-container"><span class="bar-label" style="color:#ecf0f1;">ACT</span><div class="bar-bg"><div id="enemy-atb-fill-${i}" class="bar-fill atb-fill"></div></div></div>
                </div>
                <div class="mini-avatar-box">
                    <div id="enemy-hud-avatar-layers-${i}" class="paper-doll-container" style="display:none;"></div>
                    <img id="enemy-hud-avatar-img-${i}" src="" style="display:none;">
                </div>
            </div>
        `;

        battleContainer.innerHTML += `
            <div id="enemy-container-${i}" class="enemy-container-slot" onclick="window.setCombatTarget(${i})">
                <div id="enemy-layers-${i}" class="paper-doll-container" style="display:none;"></div>
                <img id="enemy-image-${i}" src="" style="display:none;">
            </div>
        `;
    }

    for (let i = 0; i < numEnemies; i++) {
        let e = window.currentEnemies[i];
        await buildBattleCharacter(e.data, 'f', `enemy-image-${i}`, `enemy-layers-${i}`);
        await buildBattleCharacter(e.data, 'f', `enemy-hud-avatar-img-${i}`, `enemy-hud-avatar-layers-${i}`);
    }

    window.autoSelectNextTarget();
    updateBattleUI(); // Faz o update inicial para todas zerarem
    document.getElementById('combat-dialogue').innerText = `Apareceu: ${names.join(', ')}! A batalha começa.`;

    setTimeout(() => {
        window.processNextTurn();
    }, 1000);
}

// ==== O NOVO CORAÇÃO DO SISTEMA DE TURNOS (Animações de Barra ATB) ====
window.processNextTurn = function () {
    let aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (window.playerHP <= 0) { handlePlayerDeath(); return; }
    if (aliveEnemies.length === 0) { window.winBattle(); return; }

    let minTime = Infinity;
    let nextActor = null;

    for (let c of window.combatants) {
        if (c.isDead) continue;

        // NOVA FÓRMULA: Velocidade = 10 + Destreza
        let currentSpeed = 10 + (c.dex || 0);
        let timeToTurn = (1000 - c.actionValue) / currentSpeed;

        if (timeToTurn < minTime) {
            minTime = timeToTurn;
            nextActor = c;
        }
    }

    if (!nextActor) return;

    // Avança o tempo para todos usando a nova fórmula
    for (let c of window.combatants) {
        if (c.isDead) continue;
        let currentSpeed = 10 + (c.dex || 0);
        c.actionValue += minTime * currentSpeed;
    }

    window.updateATBBars();

    setTimeout(() => {
        if (nextActor.isPlayer) {
            document.getElementById('combat-dialogue').innerText = "Seu turno!";
            window.isTurnBusy = false;
            toggleCombatButtons(false);
        } else {
            window.isTurnBusy = true;
            toggleCombatButtons(true);
            setTimeout(() => executeEnemyTurn(nextActor), 500);
        }
    }, 550);
}

async function executeEnemyTurn(actor) {
    let e = window.currentEnemies[actor.id];
    if (!e || e.isDead) { actor.isDead = true; window.processNextTurn(); return; }

    let enemyAtkIds = [1];
    try { enemyAtkIds = typeof e.data.attacks === "string" ? JSON.parse(e.data.attacks) : e.data.attacks; } catch (err) { }
    if (!enemyAtkIds || enemyAtkIds.length === 0) enemyAtkIds = [1];

    let affordable = enemyAtkIds.filter(id => {
        const ea = window.gameData.attacks.find(a => a.id == id);
        if (!ea) return false;
        return (ea.hp_cost || 0) <= e.hp && (ea.mana_cost || 0) <= e.mana && (ea.stamina_cost || 0) <= e.stamina;
    });

    let msg = "";
    if (affordable.length > 0) {
        let randomAtkId = affordable[Math.floor(Math.random() * affordable.length)];
        const resE = await window.pywebview.api.process_battle_turn(e.stats, window.playerFullStats, randomAtkId, 1);

        e.hp = Math.max(0, e.hp - resE.hp_cost);
        e.stamina = Math.max(0, e.stamina - resE.stamina_cost);
        e.mana = Math.max(0, e.mana - resE.mana_cost);

        if (resE.dodged) {
            window.showFloatingDamage(`player-container`, "Esquiva!", "dmg-dodge");
        } else {
            window.playerHP = Math.max(0, window.playerHP - resE.damage);
            let cssClass = resE.is_crit ? "dmg-crit" : (resE.atk_type === 'mag' ? "dmg-mag" : "dmg-phys");
            window.showFloatingDamage(`player-container`, resE.damage, cssClass);

            const pContainer = document.getElementById('player-container');
            if (pContainer) { pContainer.classList.add('enemy-hit'); setTimeout(() => pContainer.classList.remove('enemy-hit'), 200); }
        }
        msg = `[${e.data.name}]: ${resE.msg}`;
    } else {
        e.hp = Math.min(e.stats.computed.hp, e.hp + 5);
        e.stamina = Math.min(e.stats.computed.stamina, e.stamina + 20);
        e.mana = Math.min(e.stats.computed.mana, e.mana + 20);
        msg = `[${e.data.name}] descansou o turno.`;
    }

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = msg;

    // Gasta o turno
    actor.actionValue -= 1000;
    window.updateATBBars(); // Anima a barra dele caindo instantaneamente

    setTimeout(() => { window.processNextTurn(); }, 1200);
}

window.startTurnSequence = async function (attackId) {
    if (window.isTurnBusy) return;

    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) {
        window.autoSelectNextTarget();
        target = window.currentEnemies[window.combatTargetIndex];
    }
    if (!target || target.isDead) return;

    window.isTurnBusy = true;
    toggleCombatButtons(true);

    if (!window.attackExp[attackId]) window.attackExp[attackId] = { xp: 0, level: 1 };
    let expObj = window.attackExp[attackId];

    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, target.stats, attackId, expObj.level);

    window.playerHP = Math.max(0, window.playerHP - res.hp_cost);
    window.playerStamina = Math.max(0, window.playerStamina - res.stamina_cost);
    window.playerMana = Math.max(0, window.playerMana - res.mana_cost);

    let levelUpMsg = "";

    if (res.dodged) {
        window.showFloatingDamage(`enemy-container-${target.index}`, "Esquiva!", "dmg-dodge");
    } else {
        target.hp = Math.max(0, target.hp - res.damage);
        let cssClass = res.is_crit ? "dmg-crit" : (res.atk_type === 'mag' ? "dmg-mag" : "dmg-phys");
        window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, cssClass);

        let reqXp = expObj.level * 100;
        expObj.xp += 35;
        if (expObj.xp >= reqXp) {
            expObj.xp -= reqXp;
            expObj.level += 1;
            levelUpMsg = ` \n🌟[Nível ${expObj.level}]`;
            renderCombatHotbar();
        }
    }

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Você usou Habilidade: ${res.msg}${levelUpMsg}`;

    // Gasta o turno e anima a barra do jogador esvaziando
    let p = window.combatants.find(c => c.isPlayer);
    if (p) p.actionValue -= 1000;
    window.updateATBBars();

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            let c = window.combatants.find(co => !co.isPlayer && co.id === target.index);
            if (c) c.isDead = true;

            document.getElementById(`enemy-container-${target.index}`).classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`).classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`).classList.remove('is-targeted-hud');
        }

        setTimeout(() => { window.processNextTurn(); }, 500);
    }, 600);
}

function handlePlayerDeath() {
    let ouroPerdido = Math.floor(window.playerGold / 2);
    window.playerGold -= ouroPerdido;
    document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;
    window.updateHUD();
    window.saveGameState();

    setTimeout(() => {
        window.playerHP = window.playerFullStats.computed.hp;
        window.playerMana = window.playerFullStats.computed.mana;
        window.playerStamina = window.playerFullStats.computed.stamina;
        window.combatants = [];
        window.currentEnemies = [];
        backToCity();
    }, 3000);
}

window.winBattle = async function () {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loots...";

    let allLoot = [];
    for (let i = 0; i < window.currentEnemies.length; i++) {
        let res = await window.pywebview.api.generate_loot(window.currentEnemies[i].id, window.activeSaveId);
        window.playerInventory = res.new_inventory;
        window.playerGold = res.new_gold;
        allLoot.push(...res.loot_list);
    }

    window.updateHUD();
    await window.saveGameState();

    setTimeout(() => {
        document.getElementById('loot-list').innerHTML = allLoot.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
}

window.continueDungeon = function () {
    document.getElementById('loot-modal').style.display = 'none';
    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    toggleCombatButtons(true);
    spawnEnemies();
}

window.fleeBattle = function () {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    toggleCombatButtons(true);

    let aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return;

    let pDes = window.playerFullStats.base.des;
    let maxEDes = Math.max(...aliveEnemies.map(e => e.stats.base.des));

    let fleeChance = 50 + ((pDes - maxEDes) * 5);
    fleeChance = Math.max(10, Math.min(90, fleeChance));
    let roll = Math.random() * 100;

    if (roll <= fleeChance) {
        document.getElementById('combat-dialogue').innerText = "Fuga com sucesso!";
        setTimeout(() => {
            window.isTurnBusy = false;
            window.combatants = [];
            window.currentEnemies = [];
            backToCity();
        }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "A fuga falhou! Você perdeu o turno e não conseguiu recuar.";

        let p = window.combatants.find(c => c.isPlayer);
        if (p) p.actionValue -= 1000;
        window.updateATBBars();

        setTimeout(() => { window.processNextTurn(); }, 1000);
    }
}

window.closeLootAndReturn = function () {
    const modal = document.getElementById('loot-modal');
    if (modal) modal.style.display = 'none';

    // Limpa os dados de combate para a próxima vez
    window.combatants = [];
    window.currentEnemies = [];
    window.isTurnBusy = false;

    backToCity();
};