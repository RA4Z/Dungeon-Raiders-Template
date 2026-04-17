// frontend/src/js/combat_core.js

window.combatants =[];

// ══════════════════════════════════════════════════
// ENTRADA NA DUNGEON
// ══════════════════════════════════════════════════
window.enterDungeon = async function() {
    setView('combat-screen');
    const floor = window._dungeonCurrentFloor || 1;
    document.getElementById('combat-dialogue').innerText = `Andar ${floor} — Preparando o campo de batalha...`;
    window.updateHUD();
    renderCombatHotbar();
    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;

    // Limpa avatares
    document.getElementById('player-hud-avatar-layers').innerHTML = '';
    document.getElementById('player-hud-avatar-img').src = '';

    await buildBattleCharacter(window.activePlayer, 'f', 'player-hud-avatar-img', 'player-hud-avatar-layers');
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    // Renderiza aliados da party no campo e no HUD
    await renderPartyInBattle();

    await spawnEnemies();
};

// ══════════════════════════════════════════════════
// PARTY NO CAMPO DE BATALHA E HUD
// ══════════════════════════════════════════════════
async function renderPartyInBattle() {
    const partyContainer = document.getElementById('party-battlefield-container');
    const alliesHudContainer = document.getElementById('allies-hud-container');
    if (!partyContainer || !alliesHudContainer) return;
    
    partyContainer.innerHTML = '';
    // Limpa os blocos de HUD antigos dos aliados
    document.querySelectorAll('.ally-hud-block').forEach(el => el.remove());

    const party   = window._party || [];
    const hired   = window._hiredAllies ||[];

    if (!window._partyStats) window._partyStats = {};

    for (let i = 0; i < party.length; i++) {
        const memberId = party[i];
        const ally     = hired.find(a => a.member_id === memberId);
        if (!ally) continue;

        // Stats do aliado
        const allyStats = await window.pywebview.api.load_enemy_full_stats(ally.character_id);
        if (!allyStats) continue;

        window._partyStats[memberId] = {
            ally, stats: allyStats,
            hp:      ally.hp || allyStats.computed.hp,
            mana:    ally.mana || allyStats.computed.mana,
            stamina: ally.stamina || allyStats.computed.stamina,
            isDead:  false,
        };

        // Renderiza no Campo de Batalha
        partyContainer.innerHTML += `
        <div class="party-member-slot" id="party-slot-${memberId}">
            <div id="party-layers-${memberId}" class="paper-doll-container" style="display:none;"></div>
            <img id="party-img-${memberId}" src="" style="display:none;" class="battlefield-sprite">
        </div>`;

        // Renderiza no HUD Esquerdo (junto do Player)
        alliesHudContainer.innerHTML += `
        <div class="combat-stat-block player-stat ally-hud-block" id="ally-hud-block-${memberId}" style="margin-top: 5px; opacity: 0.9; transform: scale(0.95); transform-origin: top left;">
            <div class="mini-avatar-box">
                <div id="ally-hud-avatar-layers-${memberId}" class="paper-doll-container" style="display:none;"></div>
                <img id="ally-hud-avatar-img-${memberId}" src="" style="display:none;">
            </div>
            <div style="flex:1;">
                <span class="player-name-ui" style="color: #2ecc71; font-size: 0.85rem;">${ally.name}</span>
                <div class="bar-container"><span class="bar-label">HP</span><div class="bar-bg"><div id="ally-hp-fill-${memberId}" class="bar-fill hp-fill"></div></div></div>
                <div class="bar-container"><span class="bar-label">MP</span><div class="bar-bg"><div id="ally-mp-fill-${memberId}" class="bar-fill mp-fill"></div></div></div>
                <div class="bar-container"><span class="bar-label">SP</span><div class="bar-bg"><div id="ally-sp-fill-${memberId}" class="bar-fill sp-fill"></div></div></div>
                <div class="bar-container"><span class="bar-label" style="color:#ecf0f1;">ACT</span><div class="bar-bg"><div id="ally-atb-fill-${memberId}" class="bar-fill atb-fill"></div></div></div>
            </div>
        </div>`;
    }

    // Aplica as imagens assincronamente (AGORA DE COSTAS NO CAMPO DE BATALHA!)
    for (let i = 0; i < party.length; i++) {
        const memberId = party[i];
        const ally     = hired.find(a => a.member_id === memberId);
        if (!ally) continue;
        
        const fakeChar = { race: ally.race, img_front: ally.img_front, img_back: ally.img_back, equipment_data: ally.equipment_data };
        
        // Campo: Virado de costas ('b') para o inimigo
        await buildBattleCharacter(fakeChar, 'b', `party-img-${memberId}`, `party-layers-${memberId}`);
        // HUD: Rosto do aliado ('f')
        await buildBattleCharacter(fakeChar, 'f', `ally-hud-avatar-img-${memberId}`, `ally-hud-avatar-layers-${memberId}`);
    }
}

function updatePartyHUD() {
    if (!window._partyStats) return;
    for (const [memberId, ps] of Object.entries(window._partyStats)) {
        if (ps.isDead) {
            document.getElementById(`ally-hud-block-${memberId}`)?.classList.add('dead');
        } else {
            const c = ps.stats.computed;
            const hpEl = document.getElementById(`ally-hp-fill-${memberId}`);
            const mpEl = document.getElementById(`ally-mp-fill-${memberId}`);
            const spEl = document.getElementById(`ally-sp-fill-${memberId}`);
            
            if(hpEl) hpEl.style.width = `${Math.max(0, (ps.hp / c.hp) * 100)}%`;
            if(mpEl) mpEl.style.width = `${Math.max(0, (ps.mana / c.mana) * 100)}%`;
            if(spEl) spEl.style.width = `${Math.max(0, (ps.stamina / c.stamina) * 100)}%`;
        }
    }
}

// ══════════════════════════════════════════════════
// SPAWN DE INIMIGOS
// ══════════════════════════════════════════════════
async function spawnEnemies() {
    window.currentEnemies =[];
    window.combatants =[];

    const floor      = window._dungeonCurrentFloor || 1;
    const numEnemies = Math.min(
        window.MAX_ENEMIES_IN_COMBAT,
        Math.floor(Math.random() * Math.min(3, 1 + Math.floor(floor / 3))) + 1
    );

    const hudContainer    = document.getElementById('enemies-hud-container');
    const battleContainer = document.getElementById('enemies-battlefield-container');
    hudContainer.innerHTML    = '';
    battleContainer.innerHTML = '';

    let names =[];

    window.combatants.push({
        id: 'player', isPlayer: true, isAlly: false,
        name: window.activePlayer.name,
        dex: window.playerFullStats.base.des,
        actionValue: 0, isDead: false
    });

    const party = window._party ||[];
    for (const memberId of party) {
        const ps = window._partyStats?.[memberId];
        if (!ps || ps.isDead) continue;
        window.combatants.push({
            id: `ally_${memberId}`, isPlayer: false, isAlly: true,
            memberId, name: ps.ally.name,
            dex: ps.stats.base.des || 5,
            actionValue: 0, isDead: false
        });
    }

    for (let i = 0; i < numEnemies; i++) {
        const enemyData  = await window.pywebview.api.get_random_enemy_for_floor(floor);
        if (!enemyData) continue;
        const enemyStats = await window.pywebview.api.load_enemy_full_stats(enemyData.id);

        const floorMult = 1 + (floor - 1) * 0.05;
        const scaledStats = JSON.parse(JSON.stringify(enemyStats));
        scaledStats.computed.hp      = Math.floor(scaledStats.computed.hp      * floorMult);
        scaledStats.computed.phys_dmg= scaledStats.computed.phys_dmg * floorMult;
        scaledStats.computed.mag_dmg = scaledStats.computed.mag_dmg  * floorMult;
        scaledStats.computed.phys_res= scaledStats.computed.phys_res * floorMult;
        scaledStats.computed.mag_res = scaledStats.computed.mag_res  * floorMult;

        let enemyObj = {
            index: i, id: enemyData.id, data: enemyData,
            stats: scaledStats,
            hp:      scaledStats.computed.hp,
            mana:    scaledStats.computed.mana,
            stamina: scaledStats.computed.stamina,
            isDead:  false
        };
        window.currentEnemies.push(enemyObj);
        names.push(enemyData.name);

        window.combatants.push({
            id: i, isPlayer: false, isAlly: false,
            name: enemyData.name,
            dex: enemyStats.base.des,
            actionValue: 0, isDead: false
        });

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
        </div>`;

        battleContainer.innerHTML += `
        <div id="enemy-container-${i}" class="enemy-container-slot" onclick="window.setCombatTarget(${i})">
            <div id="enemy-layers-${i}" class="paper-doll-container" style="display:none;"></div>
            <img id="enemy-image-${i}" src="" style="display:none;" class="battlefield-sprite">
        </div>`;
    }

    for (let i = 0; i < numEnemies; i++) {
        let e = window.currentEnemies[i];
        await buildBattleCharacter(e.data,'f',`enemy-image-${i}`,`enemy-layers-${i}`);
        await buildBattleCharacter(e.data,'f',`enemy-hud-avatar-img-${i}`,`enemy-hud-avatar-layers-${i}`);
    }

    window.autoSelectNextTarget();
    updateBattleUI();
    const floorLabel = getDangerLabel ? getDangerLabel(floor) : { icon:'⚔️' };
    document.getElementById('combat-dialogue').innerText =
        `Andar ${floor} ${floorLabel?.icon||''} — Apareceu: ${names.join(', ')}!`;

    setTimeout(() => window.processNextTurn(), 1000);
}

// ══════════════════════════════════════════════════
// SISTEMA DE TURNOS (ATB)
// ══════════════════════════════════════════════════
window.processNextTurn = function() {
    let aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (window.playerHP <= 0) { handlePlayerDeath(); return; }
    if (aliveEnemies.length === 0) { window.winBattle(); return; }

    let minTime   = Infinity;
    let nextActor = null;
    for (let c of window.combatants) {
        if (c.isDead) continue;
        let speed = 10 + (c.dex || 0);
        let timeToTurn = (1000 - c.actionValue) / speed;
        if (timeToTurn < minTime) { minTime = timeToTurn; nextActor = c; }
    }
    if (!nextActor) return;

    for (let c of window.combatants) {
        if (c.isDead) continue;
        c.actionValue += minTime * (10 + (c.dex || 0));
    }
    window.updateATBBars();

    setTimeout(() => {
        if (nextActor.isPlayer) {
            document.getElementById('combat-dialogue').innerText = "Seu turno!";
            window.isTurnBusy = false;
            toggleCombatButtons(false);
        } else if (nextActor.isAlly) {
            window.isTurnBusy = true;
            toggleCombatButtons(true);
            setTimeout(() => executeAllyTurn(nextActor), 500);
        } else {
            window.isTurnBusy = true;
            toggleCombatButtons(true);
            setTimeout(() => executeEnemyTurn(nextActor), 500);
        }
    }, 550);
};

// ══════════════════════════════════════════════════
// TURNO DO ALIADO (IA)
// ══════════════════════════════════════════════════
async function executeAllyTurn(actor) {
    const ps = window._partyStats?.[actor.memberId];
    if (!ps || ps.isDead) { actor.isDead = true; window.processNextTurn(); return; }

    const ally      = ps.ally;
    const hotbar    = ally.hotbar || ally.attacks || [1];
    const validAtks = hotbar.filter(id => id !== null && id !== undefined);

    const affordable = validAtks.filter(id => {
        const a = (window.gameData.attacks||[]).find(a => a.id == id);
        return a && (a.hp_cost||0) <= ps.hp && (a.mana_cost||0) <= ps.mana && (a.stamina_cost||0) <= ps.stamina;
    });

    let msg = '';
    const target = window.currentEnemies.find(e => !e.isDead);
    if (!target) { window.processNextTurn(); return; }

    if (affordable.length > 0) {
        const atkId = affordable[Math.floor(Math.random() * affordable.length)];
        const res   = await window.pywebview.api.process_battle_turn(ps.stats, target.stats, atkId, 1);
        ps.hp      = Math.max(0, ps.hp - res.hp_cost);
        ps.stamina = Math.max(0, ps.stamina - res.stamina_cost);
        ps.mana    = Math.max(0, ps.mana    - res.mana_cost);

        if (!res.dodged) {
            target.hp = Math.max(0, target.hp - res.damage);
            const cssClass = res.is_crit ? 'dmg-crit' : (res.atk_type==='mag' ? 'dmg-mag' : 'dmg-phys');
            window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, cssClass);
        }
        msg = `[${ally.name}]: ${res.msg}`;
    } else {
        ps.hp      = Math.min(ps.stats.computed.hp, ps.hp + 5);
        ps.stamina = Math.min(ps.stats.computed.stamina, ps.stamina + 20);
        msg = `[${ally.name}] descansou o turno.`;
    }

    updateBattleUI();
    updatePartyHUD();
    document.getElementById('combat-dialogue').innerText = msg;
    actor.actionValue -= 1000;
    window.updateATBBars();

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            const c = window.combatants.find(co => !co.isPlayer && !co.isAlly && co.id === target.index);
            if (c) c.isDead = true;
            document.getElementById(`enemy-container-${target.index}`).classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`).classList.add('dead');
        }
        setTimeout(() => window.processNextTurn(), 500);
    }, 600);
}

// ══════════════════════════════════════════════════
// TURNO DO INIMIGO
// ══════════════════════════════════════════════════
async function executeEnemyTurn(actor) {
    let e = window.currentEnemies[actor.id];
    if (!e || e.isDead) { actor.isDead = true; window.processNextTurn(); return; }

    let enemyAtkIds = [1];
    try { enemyAtkIds = typeof e.data.attacks === 'string' ? JSON.parse(e.data.attacks) : e.data.attacks; } catch {}
    if (!enemyAtkIds?.length) enemyAtkIds = [1];

    const affordable = enemyAtkIds.filter(id => {
        const ea = (window.gameData.attacks||[]).find(a => a.id == id);
        return ea && (ea.hp_cost||0) <= e.hp && (ea.mana_cost||0) <= e.mana && (ea.stamina_cost||0) <= e.stamina;
    });

    let msg = '';
    if (affordable.length > 0) {
        const randomAtkId = affordable[Math.floor(Math.random() * affordable.length)];

        const aliveAllies = Object.entries(window._partyStats || {})
            .filter(([,ps]) => !ps.isDead)
            .map(([id]) => id);
        const targets = ['player', ...aliveAllies];
        const chosenTarget = targets[Math.floor(Math.random() * targets.length)];

        let defenderStats;
        if (chosenTarget === 'player') {
            defenderStats = window.playerFullStats;
        } else {
            defenderStats = window._partyStats[chosenTarget]?.stats;
        }
        if (!defenderStats) { defenderStats = window.playerFullStats; }

        const resE = await window.pywebview.api.process_battle_turn(e.stats, defenderStats, randomAtkId, 1);

        e.hp      = Math.max(0, e.hp - resE.hp_cost);
        e.stamina = Math.max(0, e.stamina - resE.stamina_cost);
        e.mana    = Math.max(0, e.mana    - resE.mana_cost);

        if (!resE.dodged) {
            if (chosenTarget === 'player') {
                window.playerHP = Math.max(0, window.playerHP - resE.damage);
                const css = resE.is_crit ? 'dmg-crit' : (resE.atk_type==='mag' ? 'dmg-mag' : 'dmg-phys');
                window.showFloatingDamage('player-container', resE.damage, css);
                const pC = document.getElementById('player-container');
                if (pC) { pC.classList.add('enemy-hit'); setTimeout(() => pC.classList.remove('enemy-hit'), 200); }
            } else {
                const ps = window._partyStats[chosenTarget];
                if (ps) {
                    ps.hp = Math.max(0, ps.hp - resE.damage);
                    if (ps.hp <= 0) {
                        ps.isDead = true;
                        const ac = window.combatants.find(c => c.isAlly && String(c.memberId) === String(chosenTarget));
                        if (ac) ac.isDead = true;
                        document.getElementById(`party-slot-${chosenTarget}`)?.classList.add('dead');
                    }
                    window.showFloatingDamage(`party-slot-${chosenTarget}`, resE.damage, 'dmg-phys');
                }
            }
        } else {
            const tgtId = chosenTarget === 'player' ? 'player-container' : `party-slot-${chosenTarget}`;
            window.showFloatingDamage(tgtId, "Esquiva!", "dmg-dodge");
        }
        msg = `[${e.data.name}]: ${resE.msg}`;
    } else {
        e.hp      = Math.min(e.stats.computed.hp, e.hp + 5);
        e.stamina = Math.min(e.stats.computed.stamina, e.stamina + 20);
        e.mana    = Math.min(e.stats.computed.mana, e.mana + 20);
        msg = `[${e.data.name}] descansou o turno.`;
    }

    updateBattleUI();
    updatePartyHUD();
    document.getElementById('combat-dialogue').innerText = msg;
    actor.actionValue -= 1000;
    window.updateATBBars();
    setTimeout(() => window.processNextTurn(), 1200);
}

// ══════════════════════════════════════════════════
// TURNO DO PLAYER
// ══════════════════════════════════════════════════
window.startTurnSequence = async function(attackId) {
    if (window.isTurnBusy) return;
    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) {
        window.autoSelectNextTarget();
        target = window.currentEnemies[window.combatTargetIndex];
    }
    if (!target || target.isDead) return;

    window.isTurnBusy = true;
    toggleCombatButtons(true);

    if (!window.attackExp[attackId]) window.attackExp[attackId] = { xp:0, level:1 };
    const expObj = window.attackExp[attackId];

    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, target.stats, attackId, expObj.level);

    window.playerHP      = Math.max(0, window.playerHP      - res.hp_cost);
    window.playerStamina = Math.max(0, window.playerStamina - res.stamina_cost);
    window.playerMana    = Math.max(0, window.playerMana    - res.mana_cost);

    let levelUpMsg = '';
    if (res.dodged) {
        window.showFloatingDamage(`enemy-container-${target.index}`, "Esquiva!", "dmg-dodge");
    } else {
        target.hp = Math.max(0, target.hp - res.damage);
        const css = res.is_crit ? 'dmg-crit' : (res.atk_type==='mag' ? 'dmg-mag' : 'dmg-phys');
        window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, css);
        const reqXp = expObj.level * 100;
        expObj.xp += 35;
        if (expObj.xp >= reqXp) {
            expObj.xp -= reqXp; expObj.level += 1;
            levelUpMsg = ` 🌟[Nível ${expObj.level}]`;
            renderCombatHotbar();
        }
    }

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Você: ${res.msg}${levelUpMsg}`;

    const p = window.combatants.find(c => c.isPlayer);
    if (p) p.actionValue -= 1000;
    window.updateATBBars();

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            const c = window.combatants.find(co => !co.isPlayer && !co.isAlly && co.id === target.index);
            if (c) c.isDead = true;
            document.getElementById(`enemy-container-${target.index}`).classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`).classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`).classList.remove('is-targeted-hud');
        }
        setTimeout(() => window.processNextTurn(), 500);
    }, 600);
};

// ══════════════════════════════════════════════════
// VITÓRIA / FUGA / MORTE
// ══════════════════════════════════════════════════
window.winBattle = async function() {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loot...";
    await window.advanceDungeonFloor();
    let allLoot =[];
    for (const enemy of window.currentEnemies) {
        const res = await window.pywebview.api.generate_loot(enemy.id, window.activeSaveId);
        window.playerInventory = res.new_inventory;
        window.playerGold      = res.new_gold;
        allLoot.push(...res.loot_list);
    }
    window.updateHUD();
    await window.saveGameState();

    const floor = window._dungeonCurrentFloor || 1;
    setTimeout(() => {
        document.getElementById('loot-list').innerHTML =
            `<li style="color:#f1c40f; font-weight:bold;">📍 Avançou para o Andar ${floor}</li>` +
            allLoot.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
};

window.continueDungeon = function() {
    document.getElementById('loot-modal').style.display = 'none';
    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    toggleCombatButtons(true);
    spawnEnemies();
};

function handlePlayerDeath() {
    const ouroPerdido = Math.floor(window.playerGold / 2);
    window.playerGold -= ouroPerdido;
    document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;
    window.updateHUD();
    window.saveGameState();
    setTimeout(() => {
        window.playerHP      = window.playerFullStats.computed.hp;
        window.playerMana    = window.playerFullStats.computed.mana;
        window.playerStamina = window.playerFullStats.computed.stamina;
        window.combatants    = []; window.currentEnemies=[]; window._partyStats   = {};
        backToCity();
    }, 3000);
}

window.fleeBattle = function() {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    toggleCombatButtons(true);
    const aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return;
    const pDes    = window.playerFullStats.base.des;
    const maxEDes = Math.max(...aliveEnemies.map(e => e.stats.base.des));
    const fleeChance = Math.max(10, Math.min(90, 50 + (pDes - maxEDes) * 5));
    if (Math.random() * 100 <= fleeChance) {
        document.getElementById('combat-dialogue').innerText = "Fuga com sucesso!";
        setTimeout(() => {
            window.isTurnBusy = false;
            window.combatants = []; window.currentEnemies =[]; window._partyStats = {};
            backToCity();
        }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "A fuga falhou! Você perdeu o turno.";
        const p = window.combatants.find(c => c.isPlayer);
        if (p) p.actionValue -= 1000;
        window.updateATBBars();
        setTimeout(() => window.processNextTurn(), 1000);
    }
};

window.closeLootAndReturn = function() {
    const modal = document.getElementById('loot-modal');
    if (modal) modal.style.display = 'none';
    window.combatants =[]; window.currentEnemies =[]; window._partyStats = {};
    window.isTurnBusy = false;
    backToCity();
};