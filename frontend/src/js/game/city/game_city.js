// frontend/src/js/game_city.js

function setView(viewId) {
    document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active-view'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active-view');
}

function backToCity() {
    setView('city-screen');
    window.updateHUD();
}

// ══════════════════════════════════════════════════
// LOCAIS DA CIDADE
// ══════════════════════════════════════════════════
async function goToLocation(locType) {
    if (!window.activePlayer) return alert("Por favor, selecione um Personagem Ativo!");

    if (locType === 'caverna') {
        if (window.playerHP <= 0) return alert("Você está gravemente ferido! Descanse antes de explorar.");
        window.openDungeonEntrance();
        return;
    }

    if (locType === 'quartel' && window.playerHP < 20)
        return alert("Você está muito machucado para treinar! Descanse primeiro.");

    if (locType === 'guilda') {
        await syncSaveState();
        window.openGuilds();
        return;
    }

    setView('location-screen');
    const title = document.getElementById('loc-title');
    const text = document.getElementById('loc-text');
    const actBox = document.getElementById('loc-actions');
    actBox.innerHTML = "";

    if (locType === 'casa') {
        title.innerText = "Sua Casa";
        text.innerText = "Um lugar seguro. Descanse para recuperar HP, Mana e Stamina completamente.";
        actBox.innerHTML = `<button onclick="healPlayer()" style="padding:10px 20px; background:#27ae60; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:5px;">🛌 Dormir (Recuperar Tudo / +1 Dia)</button>`;
    }
    else if (locType === 'quartel') {
        title.innerText = "Quartel General";
        text.innerText = "O mestre de armas aguarda. Treine seus atributos por 20 moedas e 1 dia.";
        let html = `<div style="display:flex; flex-direction:column; gap:10px; max-width: 450px; margin: 15px auto;">`;
        for (let k in window.STAT_MAP.base) {
            let currentLvl = window.activePlayer.base_stats[k];
            let currentXp = window.playerStatExp[k] || 0;
            let reqXp = window.getXpRequired(currentLvl);
            html += `
            <div style="background:#222; padding:15px; border-radius:5px; border:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; margin-right:15px; text-align:left;">
                    <strong style="color:#3498db;">${window.STAT_MAP.base[k]} (Lvl ${currentLvl})</strong>
                    <div style="width:100%; background:#111; height:8px; border-radius:4px; margin-top:5px; overflow:hidden;">
                        <div style="width:${(currentXp / reqXp) * 100}%; background:#2ecc71; height:100%;"></div>
                    </div>
                    <small style="color:#bdc3c7;">XP: ${currentXp} / ${reqXp}</small>
                </div>
                <button onclick="trainStat('${k}')" style="padding:10px; background:#e67e22; border:none; color:#fff; border-radius:3px; cursor:pointer; font-weight:bold; font-size:0.85em;">Treinar<br>(1 Dia / 20🪙)</button>
            </div>`;
        }
        html += `</div>`;
        actBox.innerHTML = html;
    }
    else if (locType === 'bar') {
        title.innerText = "Taverna";
        text.innerText = "Rumores dizem que as cavernas escondem riquezas imensas — e criaturas terríveis.";
    }
}

// ══════════════════════════════════════════════════
// DESCANSO — integra moral + rotinas do aliado
// ══════════════════════════════════════════════════
async function healPlayer() {
    if (!window.activePlayer || !window.playerFullStats) return;

    window.playerHP = window.playerFullStats.computed.hp;
    window.playerMana = window.playerFullStats.computed.mana;
    window.playerStamina = window.playerFullStats.computed.stamina;
    window.playerDays += 1;

    await window.saveGameState();
    const routineRes = await window.pywebview.api.process_daily_routines(window.activeSaveId);

    if (routineRes && typeof routineRes.new_gold === 'number') {
        window.playerGold = routineRes.new_gold;
    }

    if (typeof syncSaveState === 'function') await syncSaveState();
    window.updateHUD();

    // Em vez de um alert, abrimos o Jornal do Mundo
    let allMessages = [];
    if (routineRes?.messages?.length > 0) allMessages = allMessages.concat(routineRes.messages);

    const fired = routineRes?.fired_allies || [];
    if (fired.length > 0) {
        allMessages.unshift(`⚠️ <strong style="color:#e74c3c;">Atenção:</strong> ${fired.length} aliado(s) abandonaram você por falta de pagamento!`);
    }

    openWorldLog(allMessages);

    if (typeof window.renderAlliesPanel === 'function') window.renderAlliesPanel();
}


// ══════════════════════════════════════════════════
// TREINO DO PLAYER
// ══════════════════════════════════════════════════
window.trainStat = async function (statKey) {
    const COST = 20;
    const XP_GAIN = 50;
    if (window.playerGold < COST) return alert(`Precisa de ${COST} moedas!`);
    window.playerGold -= COST;
    window.playerDays += 1;
    window.updateHUD();
    let leveledUp = await window.addStatExp(statKey, XP_GAIN);
    let msg = `Treinou ${window.STAT_MAP.base[statKey]} por 1 dia e gastou 20 moedas.\nGanhou ${XP_GAIN} XP!`;
    if (leveledUp)
        msg += `\n\n🎉 LEVEL UP! ${window.STAT_MAP.base[statKey]} agora é ${window.activePlayer.base_stats[statKey]}!`;
    alert(msg);
    goToLocation('quartel');
};

window.openRanking = function () {
    if (!window.currentWorld || !window.activePlayer) return;

    document.getElementById('ranking-modal').style.display = 'flex';
    const listEl = document.getElementById('ranking-list');
    listEl.innerHTML = '<p style="color:#8b949e; text-align:center;">Calculando poder dos heróis...</p>';

    setTimeout(() => {
        let allEntities = [];

        // 1. Jogador (Usa os stats REAIS atuais)
        const pStats = Object.values(window.playerFullStats.base).reduce((a, b) => a + (parseInt(b) || 0), 0);
        allEntities.push({
            name: window.activePlayer.name + " (Você)",
            power: pStats * 5,
            guild: "Independente",
            isPlayer: true
        });

        const worldMembers = window.currentWorld.members || [];
        const guilds = window.currentWorld.guilds || [];

        worldMembers.forEach(npc => {
            const guild = guilds.find(g => String(g.id) === String(npc.guild_id));
            allEntities.push({
                name: npc.name,
                power: npc.power_score || 0,
                guild: guild ? guild.name : "Independente",
                isPlayer: false,
                isPrecreated: npc.is_precreated
            });
        });

        // Ordena por poder (do maior para o menor)
        allEntities.sort((a, b) => b.power - a.power);

        // Renderiza as linhas
        listEl.innerHTML = allEntities.slice(0, 50).map((h, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + 'º';
            const rowClass = h.isPlayer ? 'ranking-row-player' : '';
            return `
            <div class="ranking-row ${rowClass}">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="rank-pos">${medal}</span>
                    <div style="display:flex; flex-direction:column;">
                        <span class="rank-name">${h.name} ${h.isPrecreated ? '<span title="Herói Único" style="color:#f1c40f; font-size:0.7em;">⭐</span>' : ''}</span>
                        <span class="rank-guild">${h.guild}</span>
                    </div>
                </div>
                <div class="rank-power">
                    <small>PODER</small>
                    <strong>${h.power}</strong>
                </div>
            </div>`;
        }).join('');
    }, 100);
};


// ══════════════════════════════════════════════════
// JORNAL DO MUNDO (CONSOLE)
// ══════════════════════════════════════════════════
window.openWorldLog = function (messages) {
    const modal = document.getElementById('world-log-modal');
    const list = document.getElementById('world-log-list');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = '';

    if (!messages || messages.length === 0) {
        list.innerHTML = '<p style="color:#7f8c8d; text-align:center; padding:20px;">Nada de interessante aconteceu hoje.</p>';
        return;
    }

    messages.forEach(msg => {
        // Formata as mensagens de boatos
        if (msg === "--- Boatos do Mundo ---") {
            list.innerHTML += `<div style="text-align:center; margin:15px 0 5px 0; color:#f1c40f; border-bottom:1px solid #555; padding-bottom:5px; font-family:serif;">🌍 Eventos do Mundo</div>`;
        } else {
            list.innerHTML += `<div style="background:#161b22; padding:10px; border-radius:5px; border-left:3px solid #3498db; margin-bottom:6px; color:#ecf0f1; font-size:0.9em;">${msg}</div>`;
        }
    });
};