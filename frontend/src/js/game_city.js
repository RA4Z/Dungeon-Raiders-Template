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
    const title  = document.getElementById('loc-title');
    const text   = document.getElementById('loc-text');
    const actBox = document.getElementById('loc-actions');
    actBox.innerHTML = "";

    if (locType === 'casa') {
        title.innerText = "Sua Casa";
        text.innerText  = "Um lugar seguro. Descanse para recuperar HP, Mana e Stamina completamente.";
        actBox.innerHTML = `<button onclick="healPlayer()" style="padding:10px 20px; background:#27ae60; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:5px;">🛌 Dormir (Recuperar Tudo / +1 Dia)</button>`;
    }
    else if (locType === 'quartel') {
        title.innerText = "Quartel General";
        text.innerText  = "O mestre de armas aguarda. Treine seus atributos por 20 moedas e 1 dia.";
        let html = `<div style="display:flex; flex-direction:column; gap:10px; max-width: 450px; margin: 15px auto;">`;
        for (let k in window.STAT_MAP.base) {
            let currentLvl = window.activePlayer.base_stats[k];
            let currentXp  = window.playerStatExp[k] || 0;
            let reqXp      = window.getXpRequired(currentLvl);
            html += `
            <div style="background:#222; padding:15px; border-radius:5px; border:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; margin-right:15px; text-align:left;">
                    <strong style="color:#3498db;">${window.STAT_MAP.base[k]} (Lvl ${currentLvl})</strong>
                    <div style="width:100%; background:#111; height:8px; border-radius:4px; margin-top:5px; overflow:hidden;">
                        <div style="width:${(currentXp/reqXp)*100}%; background:#2ecc71; height:100%;"></div>
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
        text.innerText  = "Rumores dizem que as cavernas escondem riquezas imensas — e criaturas terríveis.";
    }
}

// ══════════════════════════════════════════════════
// DESCANSO
// ══════════════════════════════════════════════════
async function healPlayer() {
    if (window.activePlayer && window.playerFullStats) {
        window.playerHP      = window.playerFullStats.computed.hp;
        window.playerMana    = window.playerFullStats.computed.mana;
        window.playerStamina = window.playerFullStats.computed.stamina;
        window.playerDays   += 1;

        // Processa rotinas dos aliados
        const routineRes = await window.pywebview.api.process_daily_routines(window.activeSaveId);
        if (routineRes && routineRes.messages && routineRes.messages.length > 0) {
            window.playerGold = routineRes.new_gold;
        }

        window.updateHUD();
        await window.saveGameState();

        let routineMsg = '';
        if (routineRes?.messages?.length > 0)
            routineMsg = '\n\n📋 Relatório dos aliados:\n' + routineRes.messages.join('\n');

        alert(`Você dormiu profundamente. HP, Mana e Stamina restaurados!\n+1 Dia se passou.${routineMsg}`);
    }
}

// ══════════════════════════════════════════════════
// TREINO
// ══════════════════════════════════════════════════
window.trainStat = async function(statKey) {
    const COST    = 20;
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