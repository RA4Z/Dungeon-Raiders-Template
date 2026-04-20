// frontend/src/js/game/dungeon/combat_core.js
// ══════════════════════════════════════════════════
//  MOTOR DE COMBATE — com sistema de contexto
//  window.combatContext = 'dungeon' | 'tournament'
// ══════════════════════════════════════════════════

window.combatants = [];

// ── Estado de Contexto ─────────────────────────────
// Define o comportamento de vitória/derrota/fuga
window.combatContext = 'dungeon';  // padrão

// ── Dados do Torneio (preenchidos por tournament.js) ──
window._tournamentData = {
    category: null,
    opponents: [],        // lista de 15 oponentes NPC
    currentRound: 0,      // 0=Oitavas, 1=Quartas, 2=Semi, 3=Final
    currentOpponentIndex: 0,
    prize: 0,
};

// ══════════════════════════════════════════════════
// ENTRADA NA DUNGEON (contexto: dungeon)
// ══════════════════════════════════════════════════
window.enterDungeon = async function () {
    AudioManager.playBGM('combat');
    window.combatContext = 'dungeon';
    setView('combat-screen');
    const floor = window._dungeonCurrentFloor || 1;
    document.getElementById('combat-dialogue').innerText = `Andar ${floor} — Preparando o campo de batalha...`;
    window.updateBattleUI();
    if (typeof renderCombatHotbar === 'function') renderCombatHotbar();
    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    document.getElementById('player-hud-avatar-layers').innerHTML = '';
    document.getElementById('player-hud-avatar-img').src = '';

    await buildBattleCharacter(window.activePlayer, 'f', 'player-hud-avatar-img', 'player-hud-avatar-layers');
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    await renderPartyInBattle();
    await spawnEnemies();
};

// ══════════════════════════════════════════════════
// ENTRADA NO TORNEIO (contexto: tournament)
// ══════════════════════════════════════════════════
window.enterTournamentBattle = async function () {
    window.combatContext = 'tournament';
    setView('combat-screen');

    const round = window._tournamentData.currentRound;
    const roundNames = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];
    const roundLabel = roundNames[round] || `Rodada ${round + 1}`;

    document.getElementById('combat-dialogue').innerText = `🏟️ Coliseu — ${roundLabel}`;
    window.updateBattleUI();
    if (typeof renderCombatHotbar === 'function') renderCombatHotbar();
    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    document.getElementById('player-hud-avatar-layers').innerHTML = '';
    document.getElementById('player-hud-avatar-img').src = '';

    await buildBattleCharacter(window.activePlayer, 'f', 'player-hud-avatar-img', 'player-hud-avatar-layers');
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    // No torneio: sem aliados na party
    const partyContainer = document.getElementById('party-battlefield-container');
    if (partyContainer) partyContainer.innerHTML = '';

    // CORREÇÃO: Limpa apenas os blocos dos aliados, preservando a SUA HUD intacta!
    document.querySelectorAll('.ally-hud-block').forEach(el => el.remove());

    window._partyStats = {};

    await spawnTournamentEnemy();
};


// ══════════════════════════════════════════════════
// PARTY NO CAMPO DE BATALHA E HUD (apenas dungeon)
// ══════════════════════════════════════════════════
async function renderPartyInBattle() {
    const partyContainer = document.getElementById('party-battlefield-container');
    const alliesHudContainer = document.getElementById('allies-hud-container');
    if (!partyContainer || !alliesHudContainer) return;

    partyContainer.innerHTML = '';
    document.querySelectorAll('.ally-hud-block').forEach(el => el.remove());

    const party = window._party || [];
    const hired = window._hiredAllies || [];

    if (!window._partyStats) window._partyStats = {};

    for (let i = 0; i < party.length; i++) {
        const memberId = party[i];
        const ally = hired.find(a => String(a.member_id) === String(memberId));
        if (!ally) continue;

        const allyStats = await window.pywebview.api.load_ally_full_stats(window.activeSaveId, memberId);
        if (!allyStats) continue;

        window._partyStats[memberId] = {
            ally, stats: allyStats,
            hp: (ally.hp !== null && ally.hp !== undefined) ? ally.hp : allyStats.computed.hp,
            mana: (ally.mana !== null && ally.mana !== undefined) ? ally.mana : allyStats.computed.mana,
            stamina: (ally.stamina !== null && ally.stamina !== undefined) ? ally.stamina : allyStats.computed.stamina,
            isDead: false,
        };

        partyContainer.innerHTML += `
        <div class="party-member-slot" id="party-slot-${memberId}">
            <div id="party-layers-${memberId}" class="paper-doll-container" style="display:none;"></div>
            <img id="party-img-${memberId}" src="" style="display:none;" class="battlefield-sprite">
        </div>`;

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

    for (let i = 0; i < party.length; i++) {
        const memberId = party[i];
        const ally = hired.find(a => String(a.member_id) === String(memberId));
        if (!ally) continue;
        const fakeChar = { race: ally.race, img_front: ally.img_front, img_back: ally.img_back, equipment_data: ally.equipment_data };
        await buildBattleCharacter(fakeChar, 'b', `party-img-${memberId}`, `party-layers-${memberId}`);
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
            if (hpEl) hpEl.style.width = `${Math.max(0, (ps.hp / c.hp) * 100)}%`;
            if (mpEl) mpEl.style.width = `${Math.max(0, (ps.mana / c.mana) * 100)}%`;
            if (spEl) spEl.style.width = `${Math.max(0, (ps.stamina / c.stamina) * 100)}%`;
        }
    }
}

// ══════════════════════════════════════════════════
// SPAWN DE INIMIGOS — DUNGEON
// ══════════════════════════════════════════════════
async function spawnEnemies() {
    window.currentEnemies = [];
    window.combatants = [];

    const floor = window._dungeonCurrentFloor || 1;
    const numEnemies = Math.min(
        window.MAX_ENEMIES_IN_COMBAT || 3,
        Math.floor(Math.random() * Math.min(3, 1 + Math.floor(floor / 3))) + 1
    );

    const hudContainer = document.getElementById('enemies-hud-container');
    const battleContainer = document.getElementById('enemies-battlefield-container');
    hudContainer.innerHTML = '';
    battleContainer.innerHTML = '';

    let names = [];

    window.combatants.push({
        id: 'player', isPlayer: true, isAlly: false,
        name: window.activePlayer.name,
        dex: window.playerFullStats.base.des,
        actionValue: 0, isDead: false
    });

    const party = window._party || [];
    for (const memberId of party) {
        const ps = window._partyStats?.[memberId];
        if (!ps || ps.isDead) continue;
        window.combatants.push({
            id: `ally_${memberId}`, isPlayer: false, isAlly: true,
            memberId: memberId, name: ps.ally.name,
            dex: ps.stats.base.des || 5,
            actionValue: 0, isDead: false
        });
    }

    for (let i = 0; i < numEnemies; i++) {
        const enemyData = await window.pywebview.api.get_random_enemy_for_floor(floor);
        if (!enemyData) continue;
        const enemyStats = await window.pywebview.api.load_enemy_full_stats(enemyData.id);

        const floorMult = 1 + (floor - 1) * 0.05;
        const scaledStats = JSON.parse(JSON.stringify(enemyStats));
        scaledStats.computed.hp = Math.floor(scaledStats.computed.hp * floorMult);
        scaledStats.computed.phys_dmg = scaledStats.computed.phys_dmg * floorMult;
        scaledStats.computed.mag_dmg = scaledStats.computed.mag_dmg * floorMult;
        scaledStats.computed.phys_res = scaledStats.computed.phys_res * floorMult;
        scaledStats.computed.mag_res = scaledStats.computed.mag_res * floorMult;

        _addEnemyToBattle(i, enemyData, scaledStats, names, hudContainer, battleContainer);
    }

    if (names.length > 0) {
        document.getElementById('combat-dialogue').innerText = `Apareceu: ${names.join(', ')}!`;
    }

    if (typeof window.autoSelectNextTarget === 'function') window.autoSelectNextTarget();
    window.updateBattleUI();

    setTimeout(() => window.processNextTurn(), 800);
}

// ══════════════════════════════════════════════════
// SPAWN DE INIMIGO — TORNEIO (1v1)
// ══════════════════════════════════════════════════
async function spawnTournamentEnemy() {
    window.currentEnemies = [];
    window.combatants = [];

    const hudContainer = document.getElementById('enemies-hud-container');
    const battleContainer = document.getElementById('enemies-battlefield-container');
    hudContainer.innerHTML = '';
    battleContainer.innerHTML = '';

    window.combatants.push({
        id: 'player', isPlayer: true, isAlly: false,
        name: window.activePlayer.name,
        dex: window.playerFullStats.base.des,
        actionValue: 0, isDead: false
    });

    const td = window._tournamentData;
    const opponentNpc = td.opponents[td.currentOpponentIndex];
    if (!opponentNpc) return;

    let baseStats = {};
    try { baseStats = typeof opponentNpc.base_stats === 'string' ? JSON.parse(opponentNpc.base_stats) : (opponentNpc.base_stats || {}); } catch (e) { }

    const power = opponentNpc.power_score || 10;
    const computedStats = {
        hp: power * 15 + 50, mana: power * 5 + 20, stamina: power * 5 + 20,
        phys_dmg: power * 0.8, mag_dmg: power * 0.5, phys_res: power * 0.3, mag_res: power * 0.2,
        crit_rate: 5, crit_dmg: 150, dodge: 5, speed: baseStats.des || 5,
    };

    const fakeStats = { base: baseStats, computed: computedStats };

    const opponentObj = {
        index: 0, id: opponentNpc.id || -1, data: opponentNpc, stats: fakeStats,
        hp: computedStats.hp, mana: computedStats.mana, stamina: computedStats.stamina,
        isDead: false, isTournamentNpc: true, attacks: [1],
    };

    window.currentEnemies.push(opponentObj);
    window.combatants.push({
        id: 0, isPlayer: false, isAlly: false, name: opponentNpc.name,
        dex: baseStats.des || 5, actionValue: 0, isDead: false
    });

    const round = td.currentRound;
    const roundNames = ['Oitavas', 'Quartas', 'Semifinal', 'Final'];

    // AQUI ENTROU A CORREÇÃO DE LAYOUT: <div style="flex:1;">
    hudContainer.innerHTML = `
    <div class="combat-stat-block enemy-stat" id="enemy-hud-block-0" onclick="if(window.setCombatTarget) window.setCombatTarget(0)">
        <div style="flex:1;">
            <div style="font-weight:bold; color:#e74c3c; margin-bottom:4px; font-size:0.9rem;">
                🏟️ ${roundNames[round] || 'Rodada'} | ${opponentNpc.name}
            </div>
            <div class="bar-container"><span class="bar-label">HP</span><div class="bar-bg"><div id="enemy-hp-fill-0" class="bar-fill hp-fill" style="width:100%"></div></div></div>
            <div class="bar-container"><span class="bar-label">MP</span><div class="bar-bg"><div id="enemy-mp-fill-0" class="bar-fill mp-fill" style="width:100%"></div></div></div>
            <div class="bar-container"><span class="bar-label">SP</span><div class="bar-bg"><div id="enemy-sp-fill-0" class="bar-fill sp-fill" style="width:100%"></div></div></div>
            <div class="bar-container"><span class="bar-label" style="color:#ecf0f1;">ACT</span><div class="bar-bg"><div id="enemy-atb-fill-0" class="bar-fill atb-fill" style="width:0%"></div></div></div>
        </div>
    </div>`;

    battleContainer.innerHTML = `
    <div class="enemy-container-slot is-targeted" id="enemy-container-0" onclick="if(window.setCombatTarget) window.setCombatTarget(0)">
        <div id="enemy-layers-0" class="paper-doll-container" style="display:none;"></div>
        <img id="enemy-img-0" src="" style="max-width:100%; max-height:180px; object-fit:contain; display:block;">
        <div class="enemy-name-badge">${opponentNpc.name} (PS: ${power})</div>
    </div>`;

    const fakeChar = { race: opponentNpc.race || 'humano', img_front: opponentNpc.img_front || '', img_back: opponentNpc.img_back || '', equipment_data: opponentNpc.equipment_data || '{}' };
    await buildBattleCharacter(fakeChar, 'f', 'enemy-img-0', 'enemy-layers-0');

    window.combatTargetIndex = 0;
    document.getElementById('combat-dialogue').innerText = `⚔️ Seu adversário: ${opponentNpc.name} (Poder: ${power})`;
    setTimeout(() => window.processNextTurn(), 800);
}

// Helper interno compartilhado para adicionar inimigo à batalha (DUNGEON)
function _addEnemyToBattle(i, enemyData, scaledStats, names, hudContainer, battleContainer) {
    try {
        let enemyAtks = JSON.parse(enemyData.attacks || '[1]');
        const enemyObj = {
            index: i, id: enemyData.id, data: enemyData, stats: scaledStats,
            hp: scaledStats.computed.hp, mana: scaledStats.computed.mana, stamina: scaledStats.computed.stamina,
            isDead: false, attacks: enemyAtks,
        };
        window.currentEnemies.push(enemyObj);
        window.combatants.push({
            id: i, isPlayer: false, isAlly: false, name: enemyData.name,
            dex: scaledStats.base.des || 5, actionValue: 0, isDead: false
        });
        names.push(enemyData.name);

        // AQUI ENTROU A CORREÇÃO DE LAYOUT: <div style="flex:1;">
        hudContainer.innerHTML += `
        <div class="combat-stat-block enemy-stat" id="enemy-hud-block-${i}" onclick="if(window.setCombatTarget) window.setCombatTarget(${i})">
            <div style="flex:1;">
                <div style="font-weight:bold; color:#e74c3c; margin-bottom:4px; font-size:0.85rem;">${enemyData.name}</div>
                <div class="bar-container"><span class="bar-label">HP</span><div class="bar-bg"><div id="enemy-hp-fill-${i}" class="bar-fill hp-fill" style="width:100%"></div></div></div>
                <div class="bar-container"><span class="bar-label">MP</span><div class="bar-bg"><div id="enemy-mp-fill-${i}" class="bar-fill mp-fill" style="width:100%"></div></div></div>
                <div class="bar-container"><span class="bar-label">SP</span><div class="bar-bg"><div id="enemy-sp-fill-${i}" class="bar-fill sp-fill" style="width:100%"></div></div></div>
                <div class="bar-container"><span class="bar-label" style="color:#ecf0f1;">ACT</span><div class="bar-bg"><div id="enemy-atb-fill-${i}" class="bar-fill atb-fill" style="width:0%"></div></div></div>
            </div>
            <div class="mini-avatar-box">
                <div id="enemy-hud-avatar-layers-${i}" class="paper-doll-container" style="display:none;"></div>
                <img id="enemy-hud-avatar-img-${i}" src="" style="display:none;">
            </div>
        </div>`;

        battleContainer.innerHTML += `
        <div class="enemy-container-slot ${i === 0 ? 'is-targeted' : ''}" id="enemy-container-${i}" onclick="if(window.setCombatTarget) window.setCombatTarget(${i})">
            <div id="enemy-layers-${i}" class="paper-doll-container" style="display:none;"></div>
            <img id="enemy-img-${i}" src="" style="max-width:100%; max-height:180px; object-fit:contain;">
            <div class="enemy-name-badge">${enemyData.name}</div>
        </div>`;

        const fakeChar = { race: enemyData.race, img_front: enemyData.img_front, img_back: enemyData.img_back, equipment_data: enemyData.equipment_data };
        buildBattleCharacter(fakeChar, 'f', `enemy-img-${i}`, `enemy-layers-${i}`);
    } catch (e) { console.error('Erro ao adicionar inimigo:', e); }
}


// ══════════════════════════════════════════════════
// LOOP DE TURNOS (ATB - Cálculo Preciso)
// ══════════════════════════════════════════════════
window.processNextTurn = function () {
    const alive = window.combatants.filter(c => !c.isDead);
    if (!alive.length) return;

    const allEnemiesDead = window.currentEnemies.every(e => e.isDead);
    if (allEnemiesDead) {
        _handleVictory();
        return;
    }

    const playerDead = window.playerHP <= 0;
    if (playerDead) {
        _handleDeath();
        return;
    }

    if (window.isTurnBusy) return;

    // Calcula tempo exato para o próximo alcançar 1000 de ação
    let minTime = Infinity;
    let nextActor = null;

    for (let c of alive) {
        // Atualiza a Destreza real (pode ter mudado por buffs/debuffs)
        let dex = 5;
        if (c.isPlayer) dex = window.playerFullStats?.base?.des || 5;
        else if (c.isAlly) dex = window._partyStats?.[c.memberId]?.stats?.base?.des || 5;
        else dex = window.currentEnemies.find(e => e.index === c.id)?.stats?.base?.des || 5;
        c.dex = dex;

        let speed = 10 + dex;
        let timeToTurn = (1000 - c.actionValue) / speed;
        if (timeToTurn < minTime) {
            minTime = timeToTurn;
            nextActor = c;
        }
    }

    if (!nextActor) return;

    // Avança as barras no tempo correspondente
    for (let c of alive) {
        c.actionValue += minTime * (10 + (c.dex || 0));
    }

    window.updateATBBars();

    setTimeout(() => {
        if (nextActor.isPlayer) {
            if (window._allyControlMode === 'manual') {
                window._activeCombatantControl = 'player';
                if (typeof window.renderCombatControlBar === 'function') window.renderCombatControlBar();
            }
            toggleCombatButtons(false);
            document.getElementById('combat-dialogue').innerText = 'Sua vez! Escolha um ataque.';
            window.isTurnBusy = false; // Libera a UI para clicar
        }
        else if (nextActor.isAlly) {
            if (window._allyControlMode === 'manual') {
                window._activeCombatantControl = nextActor.memberId;
                if (typeof window.renderCombatControlBar === 'function') window.renderCombatControlBar();
                toggleCombatButtons(false);
                document.getElementById('combat-dialogue').innerText = `Vez de ${nextActor.name}! Escolha o ataque.`;
                window.isTurnBusy = false; // Libera a UI para clicar
            } else {
                window.isTurnBusy = true;
                toggleCombatButtons(true);
                _allyAutoAttack(nextActor);
            }
        }
        else {
            window.isTurnBusy = true;
            toggleCombatButtons(true);
            _enemyAttack(nextActor);
        }
    }, 550);
};

function _handleVictory() {
    if (window.combatContext === 'tournament') {
        window.winTournamentRound();
    } else {
        window.winBattle();
    }
}

function _handleDeath() {
    if (window.combatContext === 'tournament') {
        _handleTournamentDeath();
    } else {
        handlePlayerDeath();
    }
}

// ══════════════════════════════════════════════════
// ATAQUE DO ALIADO (AUTO)
// ══════════════════════════════════════════════════
async function _allyAutoAttack(combatant) {
    window.isTurnBusy = true;
    const memberId = combatant.memberId;
    const ps = window._partyStats?.[memberId];
    if (!ps) { combatant.actionValue -= 1000; window.isTurnBusy = false; window.processNextTurn(); return; }

    const aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (!aliveEnemies.length) { window.isTurnBusy = false; window.processNextTurn(); return; }

    // Sempre foca no alvo selecionado se estiver vivo, senão ataca o primeiro
    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) target = aliveEnemies[0];

    const hotbar = ps.ally.hotbar || [1];
    const validAtks = hotbar.filter(id => id !== null);

    // Escolhe uma skill que possa pagar os custos, caso contrário descansa
    const affordable = validAtks.filter(id => {
        const a = (window.gameData.attacks || []).find(a => a.id == id);
        return a && (a.hp_cost || 0) <= ps.hp && (a.mana_cost || 0) <= ps.mana && (a.stamina_cost || 0) <= ps.stamina;
    });

    if (affordable.length > 0) {
        const atkId = affordable[Math.floor(Math.random() * affordable.length)];
        const result = await window.pywebview.api.process_battle_turn(
            ps.stats, target.stats, atkId, 1
        );

        if (result) {
            ps.stamina = Math.max(0, ps.stamina - (result.stamina_cost || 0));
            ps.mana = Math.max(0, ps.mana - (result.mana_cost || 0));
            ps.hp = Math.max(0, ps.hp - (result.hp_cost || 0));

            if (result.dodged) {
                AudioManager.playSFX('dodge');
                window.showFloatingDamage(`enemy-container-${target.index}`, 'Esquiva!', 'dmg-dodge');
            } else {
                target.hp = Math.max(0, target.hp - result.damage);
                window.showFloatingDamage(`enemy-container-${target.index}`, result.damage,
                    result.is_crit ? 'dmg-crit' : (result.atk_type === 'mag' ? 'dmg-mag' : 'dmg-phys'));
            }
            if (result.dodged) {
                AudioManager.playSFX('dodge');
            } else if (result.is_crit) {
                AudioManager.playSFX('crit_hit');
            } else if (result.atk_type === 'phys') {
                AudioManager.playSFX('hit_phys');
            } else {
                AudioManager.playSFX('hit_mag');
            }
            document.getElementById('combat-dialogue').innerText = `${ps.ally.name}: ${result.msg}`;
        }
    } else {
        // Sem recursos, descansa
        ps.hp = Math.min(ps.stats.computed.hp, ps.hp + 5);
        ps.stamina = Math.min(ps.stats.computed.stamina, ps.stamina + 20);
        ps.mana = Math.min(ps.stats.computed.mana, ps.mana + 20);
        document.getElementById('combat-dialogue').innerText = `[${ps.ally.name}] descansou o turno.`;
    }

    window.updateBattleUI();
    combatant.actionValue -= 1000;

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            const c = window.combatants.find(co => !co.isPlayer && !co.isAlly && co.id === target.index);
            if (c) c.isDead = true;
            document.getElementById(`enemy-container-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.remove('is-targeted-hud');
        }
        window.isTurnBusy = false;
        setTimeout(() => window.processNextTurn(), 400);
    }, 600);
}

// ══════════════════════════════════════════════════
// ATAQUE DO INIMIGO
// ══════════════════════════════════════════════════
async function _enemyAttack(combatant) {
    const enemy = window.currentEnemies.find(e => e.index === combatant.id && !e.isDead);
    if (!enemy) { combatant.actionValue -= 1000; window.isTurnBusy = false; window.processNextTurn(); return; }

    const aliveAllies = [
        { id: 'player', stats: window.playerFullStats },
        ...Object.entries(window._partyStats || {})
            .filter(([, ps]) => !ps.isDead)
            .map(([mid, ps]) => ({ id: `ally_${mid}`, memberId: mid, stats: ps.stats }))
    ].filter(a => {
        if (a.id === 'player') return window.playerHP > 0;
        return true;
    });

    if (!aliveAllies.length) { combatant.actionValue -= 1000; window.isTurnBusy = false; window.processNextTurn(); return; }

    const targetAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];

    const enemyAtkIds = (enemy.attacks && enemy.attacks.length) ? enemy.attacks : [1];
    const affordable = enemyAtkIds.filter(id => {
        const ea = (window.gameData.attacks || []).find(a => a.id == id);
        return ea && (ea.hp_cost || 0) <= enemy.hp && (ea.mana_cost || 0) <= enemy.mana && (ea.stamina_cost || 0) <= enemy.stamina;
    });

    if (affordable.length > 0) {
        const atkId = affordable[Math.floor(Math.random() * affordable.length)];
        const result = await window.pywebview.api.process_battle_turn(
            enemy.stats, targetAlly.stats, atkId, 1
        );

        if (result) {
            enemy.hp = Math.max(0, enemy.hp - result.hp_cost);
            enemy.stamina = Math.max(0, enemy.stamina - result.stamina_cost);
            enemy.mana = Math.max(0, enemy.mana - result.mana_cost);

            if (result.dodged) {
                const tgtId = targetAlly.id === 'player' ? 'player-container' : `party-slot-${targetAlly.memberId}`;
                window.showFloatingDamage(tgtId, 'Esquiva!', 'dmg-dodge');
            } else {
                if (targetAlly.id === 'player') {
                    window.playerHP = Math.max(0, window.playerHP - result.damage);
                    window.showFloatingDamage('player-container', result.damage, result.is_crit ? 'dmg-crit' : 'dmg-phys');
                } else {
                    const ps = window._partyStats[targetAlly.memberId];
                    if (ps) {
                        ps.hp = Math.max(0, ps.hp - result.damage);
                        if (ps.hp <= 0) ps.isDead = true;
                        window.showFloatingDamage(`party-slot-${targetAlly.memberId}`, result.damage, 'dmg-phys');
                    }
                }
            }
            if (result.dodged) {
                AudioManager.playSFX('dodge');
            } else if (result.is_crit) {
                AudioManager.playSFX('crit_hit');
            } else if (result.atk_type === 'phys') {
                AudioManager.playSFX('hit_phys');
            } else {
                AudioManager.playSFX('hit_mag');
            }
            document.getElementById('combat-dialogue').innerText = `${enemy.data.name}: ${result.msg}`;
        }
    } else {
        // Sem recursos, descansa
        enemy.hp = Math.min(enemy.stats.computed.hp, enemy.hp + 5);
        enemy.stamina = Math.min(enemy.stats.computed.stamina, enemy.stamina + 20);
        enemy.mana = Math.min(enemy.stats.computed.mana, enemy.mana + 20);
        document.getElementById('combat-dialogue').innerText = `[${enemy.data.name}] descansou o turno.`;
    }

    window.updateBattleUI();
    combatant.actionValue -= 1000;

    setTimeout(() => {
        window.isTurnBusy = false;
        window.processNextTurn();
    }, 800);
}

// ══════════════════════════════════════════════════
// ATAQUE DO PLAYER (chamado pela hotbar em combat_ui.js)
// ══════════════════════════════════════════════════
window.startTurnSequence = async function (atkId) {
    if (window.isTurnBusy) return;

    const playerCombatant = window.combatants.find(c => c.isPlayer);
    if (!playerCombatant || playerCombatant.actionValue < 1000) return;

    window.isTurnBusy = true;
    toggleCombatButtons(true);

    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) {
        if (typeof window.autoSelectNextTarget === 'function') window.autoSelectNextTarget();
        target = window.currentEnemies[window.combatTargetIndex];
    }

    if (!target || target.isDead) {
        window.isTurnBusy = false;
        toggleCombatButtons(false);
        return;
    }

    const expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
    const res = await window.pywebview.api.process_battle_turn(
        window.playerFullStats, target.stats, atkId, expObj.level
    );
    if (!res) { window.isTurnBusy = false; toggleCombatButtons(false); return; }

    window.playerHP = Math.max(0, window.playerHP - res.hp_cost);
    window.playerStamina = Math.max(0, window.playerStamina - res.stamina_cost);
    window.playerMana = Math.max(0, window.playerMana - res.mana_cost);

    let levelUpMsg = '';
    if (res.dodged) {
        window.showFloatingDamage(`enemy-container-${target.index}`, "Esquiva!", "dmg-dodge");
    } else {
        target.hp = Math.max(0, target.hp - res.damage);
        const css = res.is_crit ? 'dmg-crit' : (res.atk_type === 'mag' ? 'dmg-mag' : 'dmg-phys');
        window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, css);
        const reqXp = expObj.level * 100;
        expObj.xp += 35;
        if (expObj.xp >= reqXp) {
            expObj.xp -= reqXp; expObj.level += 1;
            levelUpMsg = ` 🌟[Nível ${expObj.level}]`;
            if (typeof renderCombatHotbar === 'function') renderCombatHotbar();
        }
    }

    window.updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Você: ${res.msg}${levelUpMsg}`;

    const p = window.combatants.find(c => c.isPlayer);
    if (p) p.actionValue -= 1000;
    window.updateATBBars();

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            const c = window.combatants.find(co => !co.isPlayer && !co.isAlly && co.id === target.index);
            if (c) c.isDead = true;
            document.getElementById(`enemy-container-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.remove('is-targeted-hud');
        }
        window.isTurnBusy = false;
        setTimeout(() => window.processNextTurn(), 500);
    }, 600);
};

// ══════════════════════════════════════════════════
// VITÓRIA / FUGA / MORTE — DUNGEON
// ══════════════════════════════════════════════════
window.winBattle = async function () {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loot...";
    await window.advanceDungeonFloor();
    let allLoot = [];
    let killedTargets = {};

    for (const enemy of window.currentEnemies) {
        if (enemy.isTournamentNpc) continue;
        if (enemy.id) killedTargets[enemy.id] = (killedTargets[enemy.id] || 0) + 1;
        const res = await window.pywebview.api.generate_loot(enemy.id, window.activeSaveId);
        window.playerInventory = res.new_inventory;
        window.playerGold = res.new_gold;
        allLoot.push(...res.loot_list);
    }

    for (let aq of window._activeQuests) {
        const qData = (window.currentWorld?.quests || []).find(q => String(q.id) === String(aq.quest_id));
        if (qData && qData.target_character_id) {
            const targetId = String(qData.target_character_id);
            for (let [kId, count] of Object.entries(killedTargets)) {
                if (String(kId) === targetId) {
                    aq.kills_done = (aq.kills_done || 0) + count;
                }
            }
        }
    }

    window.updateBattleUI();
    await window.saveGameState();

    const floor = window._dungeonCurrentFloor || 1;
    setTimeout(() => {
        document.getElementById('loot-list').innerHTML =
            `<li style="color:#f1c40f; font-weight:bold;">📍 Avançou para o Andar ${floor}</li>` +
            allLoot.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
};

window.continueDungeon = function () {
    document.getElementById('loot-modal').style.display = 'none';
    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    toggleCombatButtons(true);
    spawnEnemies();
};

function handlePlayerDeath() {
    AudioManager.playSFX('player_death');
    // BGM será restaurada pelo backToCity() abaixo — não parar aqui
    const ouroPerdido = Math.floor(window.playerGold / 2);
    window.playerGold -= ouroPerdido;
    document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;
    window.updateBattleUI();
    window.saveGameState();
    setTimeout(() => {
        window.playerHP = window.playerFullStats.computed.hp;
        window.playerMana = window.playerFullStats.computed.mana;
        window.playerStamina = window.playerFullStats.computed.stamina;
        window.combatants = []; window.currentEnemies = []; window._partyStats = {};
        window.isTurnBusy = false;
        backToCity();
    }, 3000);
}

window.fleeBattle = function () {
    // Fuga bloqueada no torneio
    if (window.combatContext === 'tournament') {
        if (typeof window.showToast === 'function') window.showToast('Não é possível fugir de um torneio!', 'error');
        return;
    }
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    toggleCombatButtons(true);
    const aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return;
    const pDes = window.playerFullStats.base.des;
    const maxEDes = Math.max(...aliveEnemies.map(e => e.stats.base.des));
    const fleeChance = Math.max(10, Math.min(90, 50 + (pDes - maxEDes) * 5));
    if (Math.random() * 100 <= fleeChance) {
        AudioManager.playSFX('flee');
        document.getElementById('combat-dialogue').innerText = "Fuga com sucesso!";
        setTimeout(() => {
            window.isTurnBusy = false;
            window.combatants = []; window.currentEnemies = []; window._partyStats = {};
            backToCity();
        }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "A fuga falhou! Você perdeu o turno.";
        const p = window.combatants.find(c => c.isPlayer);
        if (p) p.actionValue -= 1000;
        window.updateATBBars();
        setTimeout(() => { window.isTurnBusy = false; window.processNextTurn(); }, 1000);
    }
};

// ══════════════════════════════════════════════════
// VITÓRIA / MORTE — TORNEIO
// ══════════════════════════════════════════════════
window.winTournamentRound = async function () {
    const td = window._tournamentData;
    const roundNames = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];
    const currentRoundName = roundNames[td.currentRound] || `Rodada ${td.currentRound + 1}`;

    // Recupera 100% entre rodadas
    window.playerHP = window.playerFullStats.computed.hp;
    window.playerMana = window.playerFullStats.computed.mana;
    window.playerStamina = window.playerFullStats.computed.stamina;

    td.currentRound++;
    td.currentOpponentIndex++;

    if (td.currentRound > 3) {
        // Venceu o torneio!
        await _handleTournamentVictory();
        return;
    }

    document.getElementById('combat-dialogue').innerText =
        `✅ Venceu as ${currentRoundName}! Próxima fase: ${roundNames[td.currentRound]}`;

    setTimeout(() => {
        window.combatants = []; window.currentEnemies = []; window._partyStats = {};
        window.isTurnBusy = false;
        enterTournamentBattle();
    }, 2500);
};

async function _handleTournamentVictory() {
    const td = window._tournamentData;
    const prize = td.prize || 0;
    const category = td.category;

    await window.pywebview.api.register_tournament_win(
        window.activeSaveId, window.activePlayer.name, window.activeSaveId, true, category, prize
    );

    window.playerGold += prize;
    window.updateBattleUI();

    const catLabels = { novato: 'Novato', intermediario: 'Intermediário', avancado: 'Avançado', lendario: 'Lendário' };
    document.getElementById('combat-dialogue').innerText =
        `🏆 CAMPEÃO! Categoria ${catLabels[category] || category}! A plateia grita seu nome, e o dia chega ao fim.`;

    setTimeout(async () => {
        window.combatants = [];
        window.currentEnemies = [];
        window._partyStats = {};
        window.isTurnBusy = false;

        // 1º PASSO CRUCIAL: Sair da tela de combate para liberar as outras telas!
        if (typeof setView === 'function') setView('coliseum-screen');

        // 2º PASSO: Avançar o dia (Isso abrirá o Jornal do Mundo no fundo)
        if (typeof window.healPlayer === 'function') {
            await window.healPlayer();
        }

        // 3º PASSO: Mostrar o popup de vitória por cima de tudo
        if (typeof window.showTournamentVictoryModal === 'function') {
            window.showTournamentVictoryModal(prize, category);
        } else {
            alert(`🏆 Você venceu o torneio!\nPrêmio: ${prize} moedas de ouro!`);
            if (typeof backToCity === 'function') backToCity();
            else setView('city-screen');
        }
    }, 3000);
}

function _handleTournamentDeath() {
    document.getElementById('combat-dialogue').innerText =
        '💀 Você foi eliminado! O cansaço toma conta do seu corpo e você desmaia...';

    setTimeout(async () => {
        window.combatants = [];
        window.currentEnemies = [];
        window._partyStats = {};
        window.isTurnBusy = false;

        // Sair da tela de combate
        if (typeof setView === 'function') setView('city-screen');

        // Mesmo perdendo, o dia termina por exaustão
        if (typeof window.healPlayer === 'function') {
            await window.healPlayer();
        }

        if (typeof backToCity === 'function') backToCity();
    }, 3000);
}

window.closeLootAndReturn = function () {
    const modal = document.getElementById('loot-modal');
    if (modal) modal.style.display = 'none';
    window.combatants = [];
    window.currentEnemies = [];
    window._partyStats = {};
    window.isTurnBusy = false;
    backToCity();
};

// ══════════════════════════════════════════════════
// HELPER: ATUALIZA AS BARRAS DE VIDA (HUD) CONSTANTEMENTE
// ══════════════════════════════════════════════════
window.updateBattleUI = function () {
    // Player
    if (window.playerFullStats && window.playerFullStats.computed) {
        const c = window.playerFullStats.computed;
        const hpEl = document.getElementById('player-hp-fill');
        const mpEl = document.getElementById('player-mp-fill');
        const spEl = document.getElementById('player-sp-fill');

        if (hpEl) hpEl.style.width = `${Math.max(0, (window.playerHP / c.hp) * 100)}%`;
        if (mpEl) mpEl.style.width = `${Math.max(0, (window.playerMana / c.mana) * 100)}%`;
        if (spEl) spEl.style.width = `${Math.max(0, (window.playerStamina / c.stamina) * 100)}%`;
    }

    // Aliados (Party)
    if (typeof updatePartyHUD === 'function') updatePartyHUD();

    // Inimigos
    if (window.currentEnemies) {
        window.currentEnemies.forEach((e, i) => {
            const block = document.getElementById(`enemy-hud-block-${i}`);
            if (!block) return;
            if (e.isDead) {
                block.classList.add('dead');
                return;
            }
            const c = e.stats.computed;
            const hpE = document.getElementById(`enemy-hp-fill-${i}`);
            const mpE = document.getElementById(`enemy-mp-fill-${i}`);
            const spE = document.getElementById(`enemy-sp-fill-${i}`);

            if (hpE) hpE.style.width = `${Math.max(0, (e.hp / c.hp) * 100)}%`;
            if (mpE) mpE.style.width = `${Math.max(0, (e.mana / c.mana) * 100)}%`;
            if (spE) spE.style.width = `${Math.max(0, (e.stamina / c.stamina) * 100)}%`;
        });
    }

    window.updateATBBars();
    if (!window.isTurnBusy) toggleCombatButtons(false);
};

// ══════════════════════════════════════════════════
// ATUALIZAÇÃO DAS BARRAS ATB (Linha do Tempo)
// ══════════════════════════════════════════════════
window.updateATBBars = function () {
    if (!window.combatants) return;
    window.combatants.forEach(c => {
        if (c.isDead) return;
        let pct = Math.min(100, Math.max(0, (c.actionValue / 1000) * 100));
        let el = null;

        if (c.isPlayer) {
            el = document.getElementById('player-atb-fill');
        } else if (c.isAlly) {
            el = document.getElementById(`ally-atb-fill-${c.memberId}`);
        } else {
            el = document.getElementById(`enemy-atb-fill-${c.id}`);
        }

        if (el) el.style.width = `${pct}%`;
    });
};

// ══════════════════════════════════════════════════
// SELEÇÃO DE ALVO
// ══════════════════════════════════════════════════
window.setCombatTarget = function (index) {
    if (!window.currentEnemies[index] || window.currentEnemies[index].isDead) return;
    window.combatTargetIndex = index;

    // UI Feedback no Campo
    document.querySelectorAll('.enemy-container-slot').forEach(el => el.classList.remove('is-targeted'));
    const container = document.getElementById(`enemy-container-${index}`);
    if (container) container.classList.add('is-targeted');

    // UI Feedback no HUD
    document.querySelectorAll('.enemy-stat').forEach(el => el.classList.remove('is-targeted-hud'));
    const hud = document.getElementById(`enemy-hud-block-${index}`);
    if (hud) hud.classList.add('is-targeted-hud');
};

window.autoSelectNextTarget = function () {
    const aliveIndex = window.currentEnemies.findIndex(e => !e.isDead);
    if (aliveIndex !== -1) window.setCombatTarget(aliveIndex);
};

// ══════════════════════════════════════════════════
// DANO FLUTUANTE (ANIMAÇÃO)
// ══════════════════════════════════════════════════
window.showFloatingDamage = function (containerId, text, typeClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const span = document.createElement('span');
    span.innerText = text;
    span.className = `floating-dmg ${typeClass}`;
    container.appendChild(span);
    setTimeout(() => { if (span.parentNode) span.remove(); }, 1200);
};

// ══════════════════════════════════════════════════
// CONTROLE DE BOTÕES
// ══════════════════════════════════════════════════
window.restTurn = function () {
    if (window.isTurnBusy) return;

    const playerCombatant = window.combatants.find(c => c.isPlayer);
    if (!playerCombatant || playerCombatant.actionValue < 1000) return;

    window.isTurnBusy = true;
    if (typeof toggleCombatButtons === 'function') toggleCombatButtons(true);

    // Recupera stats limitados ao MÁXIMO do player
    const maxHp = window.playerFullStats.computed.hp;
    const maxMp = window.playerFullStats.computed.mana;
    const maxSp = window.playerFullStats.computed.stamina;

    window.playerHP = Math.min(maxHp, window.playerHP + 5);
    window.playerMana = Math.min(maxMp, window.playerMana + 20);
    window.playerStamina = Math.min(maxSp, window.playerStamina + 20);

    window.updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Você descansou e recuperou energia.`;

    playerCombatant.actionValue -= 1000;
    window.updateATBBars();

    setTimeout(() => {
        window.isTurnBusy = false;
        window.processNextTurn();
    }, 800);
};