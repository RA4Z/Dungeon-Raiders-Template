// frontend/src/js/game/city/game_city.js

// ══════════════════════════════════════════════════
// SISTEMA DE CALENDÁRIO
// Dia 1 do jogo = Segunda-feira, 01/01/Ano 1
// 7 dias = semana | 30 dias = mês | 12 meses = ano
// ══════════════════════════════════════════════════

const DAYS_OF_WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

/**
 * Converte total de dias em objeto de calendário.
 * Dia 1 = Segunda (índice 0), Domingo = índice 6.
 */
window.getCalendarFromDays = function(totalDays) {
    totalDays = Math.max(1, Math.floor(totalDays));
    const year  = Math.floor((totalDays - 1) / 360) + 1;
    const rem   = (totalDays - 1) % 360;
    const month = Math.floor(rem / 30) + 1;          // 1–12
    const day   = (rem % 30) + 1;                    // 1–30
    const dow   = (totalDays - 1) % 7;               // 0=Seg … 6=Dom
    return {
        day, month, year,
        dayOfWeek: DAYS_OF_WEEK_LABELS[dow],
        dayOfWeekIndex: dow,
        isSunday: dow === 6,
        monthName: MONTH_NAMES[month - 1] || `Mês ${month}`,
    };
};

/**
 * Formata a data para exibição na HUD.
 * Exemplo: "📅 Dom, 07/01 - Ano 3"
 */
window.formatCalendarHUD = function(totalDays) {
    const c = window.getCalendarFromDays(totalDays);
    const dd  = String(c.day).padStart(2, '0');
    const mm  = String(c.month).padStart(2, '0');
    const isSunday = c.isSunday;
    const label = `📅 ${c.dayOfWeek}, ${dd}/${mm} - Ano ${c.year}`;
    return { label, isSunday, calendar: c };
};

// ══════════════════════════════════════════════════
// OVERRIDE DE updateHUD PARA INCLUIR CALENDÁRIO
// ══════════════════════════════════════════════════
const _originalUpdateHUD = window.updateHUD;
window.updateHUD = function() {
    // Chama o HUD original
    _originalUpdateHUD?.();

    // Atualiza display do calendário
    const daysEl = document.getElementById('session-days');
    if (daysEl && window.playerDays) {
        const { label, isSunday } = window.formatCalendarHUD(window.playerDays);
        daysEl.innerHTML = isSunday
            ? `<span style="color:#f1c40f; font-weight:bold;">${label} 🏟️</span>`
            : label;
    }

    // Atualiza visibilidade do botão do Coliseu
    _updateColiseumButton();
};

function _updateColiseumButton() {
    const btn = document.getElementById('city-coliseum-btn');
    if (!btn || !window.playerDays) return;
    const { isSunday } = window.formatCalendarHUD(window.playerDays);
    if (isSunday) {
        btn.style.background = '#f1c40f';
        btn.style.color = '#1a1a2e';
        btn.title = '🎉 Hoje é Domingo! O torneio está aberto!';
        btn.innerHTML = '🏟️ Coliseu <span style="font-size:0.7em;">(Aberto!)</span>';
    } else {
        btn.style.background = '#333';
        btn.style.color = '#7f8c8d';
        const cal = window.getCalendarFromDays(window.playerDays);
        const daysUntilSunday = (7 - cal.dayOfWeekIndex) % 7 || 7;
        btn.title = `Abre aos Domingos. Faltam ${daysUntilSunday} dia(s).`;
        btn.innerHTML = `🏟️ Coliseu <span style="font-size:0.7em;">(${daysUntilSunday}d)</span>`;
    }
}

// ══════════════════════════════════════════════════
// NAVEGAÇÃO ENTRE VIEWS
// ══════════════════════════════════════════════════
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
// LOCAIS DA CIDADE — com botão do Coliseu
// ══════════════════════════════════════════════════
window.renderCityScreen = function() {
    const el = document.getElementById('city-screen');
    if (!el) return;

    // Injeta botão do Coliseu se ainda não existir
    if (!document.getElementById('city-coliseum-btn')) {
        const btn = document.createElement('button');
        btn.id = 'city-coliseum-btn';
        btn.className = 'city-location-btn';
        btn.style.cssText = `
            padding:10px 18px; border:2px solid #f1c40f; border-radius:8px;
            font-weight:bold; cursor:pointer; transition:all 0.2s; font-size:0.95rem;
        `;
        btn.onclick = () => window.openColiseum();
        el.querySelector('#city-actions')?.appendChild(btn);
        _updateColiseumButton();
    }
};

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

    if (locType === 'coliseu') {
        await window.openColiseum();
        return;
    }

    setView('location-screen');
    const title = document.getElementById('loc-title');
    const text  = document.getElementById('loc-text');
    const actBox = document.getElementById('loc-actions');
    actBox.innerHTML = "";

    if (locType === 'casa') {
        title.innerText = "Sua Casa";
        text.innerText = "Um lugar seguro. Descanse para recuperar HP, Mana e Stamina completamente.";
        actBox.innerHTML = `
        <button onclick="healPlayer()"
            style="padding:10px 20px; background:#27ae60; color:white; border:none;
            cursor:pointer; font-weight:bold; border-radius:5px;">
            🛌 Dormir (Recuperar Tudo / +1 Dia)
        </button>`;
    }
    else if (locType === 'quartel') {
        title.innerText = "Quartel General";
        text.innerText = "O mestre de armas aguarda. Treine seus atributos por 20 moedas e 1 dia.";
        let html = `<div style="display:flex; flex-direction:column; gap:10px; max-width:450px; margin:15px auto;">`;
        for (let k in window.STAT_MAP.base) {
            let currentLvl = window.activePlayer.base_stats[k];
            let currentXp  = window.playerStatExp[k] || 0;
            let reqXp      = window.getXpRequired(currentLvl);
            html += `
            <div style="background:#222; padding:15px; border-radius:5px; border:1px solid #444;
                display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; margin-right:15px; text-align:left;">
                    <strong style="color:#3498db;">${window.STAT_MAP.base[k]} (Lvl ${currentLvl})</strong>
                    <div style="width:100%; background:#111; height:8px; border-radius:4px; margin-top:5px; overflow:hidden;">
                        <div style="width:${(currentXp / reqXp) * 100}%; background:#2ecc71; height:100%;"></div>
                    </div>
                    <small style="color:#bdc3c7;">XP: ${currentXp} / ${reqXp}</small>
                </div>
                <button onclick="trainStat('${k}')"
                    style="padding:10px; background:#e67e22; border:none; color:#fff;
                    border-radius:3px; cursor:pointer; font-weight:bold; font-size:0.85em;">
                    Treinar<br>(1 Dia / 20🪙)
                </button>
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
// DESCANSO — passa 1 dia e atualiza o calendário
// ══════════════════════════════════════════════════
async function healPlayer() {
    if (!window.activePlayer || !window.playerFullStats) return;

    window.playerHP      = window.playerFullStats.computed.hp;
    window.playerMana    = window.playerFullStats.computed.mana;
    window.playerStamina = window.playerFullStats.computed.stamina;
    window.playerDays   += 1;

    // Recalcula calendário localmente para feedback imediato
    const cal = window.getCalendarFromDays(window.playerDays);

    await window.saveGameState();
    const routineRes = await window.pywebview.api.process_daily_routines(window.activeSaveId);

    if (routineRes && typeof routineRes.new_gold === 'number') {
        window.playerGold = routineRes.new_gold;
    }

    if (typeof syncSaveState === 'function') await syncSaveState();
    window.updateHUD();

    // Monta mensagens
    let allMessages = [];

    // Anúncio do novo dia
    const dd = String(cal.day).padStart(2, '0');
    const mm = String(cal.month).padStart(2, '0');
    const dayLabel = `${cal.dayOfWeek}, ${dd}/${mm} - Ano ${cal.year}`;
    allMessages.push(`🌅 Um novo dia começa. <strong>${dayLabel}</strong>`);

    // Notifica se é domingo (torneio disponível)
    if (cal.isSunday) {
        allMessages.push('🏟️ <strong style="color:#f1c40f;">Hoje é Domingo!</strong> O Coliseu está aberto para torneios.');
    }

    // Notifica virada de mês
    if (cal.day === 1) {
        allMessages.push(`📅 Começa um novo mês: <strong>${cal.monthName}, Ano ${cal.year}</strong>.`);
    }

    // Notifica virada de ano
    if (cal.day === 1 && cal.month === 1) {
        allMessages.push(`🎆 <strong style="color:#9b59b6;">Novo Ano ${cal.year}!</strong> O mundo mudou...`);
    }

    if (routineRes?.messages?.length > 0) {
        allMessages = allMessages.concat(routineRes.messages);
    }

    const fired = routineRes?.fired_allies || [];
    if (fired.length > 0) {
        allMessages.unshift(
            `⚠️ <strong style="color:#e74c3c;">Atenção:</strong> ${fired.length} aliado(s) abandonaram você por falta de pagamento!`
        );
    }

    openWorldLog(allMessages);

    if (typeof window.renderAlliesPanel === 'function') window.renderAlliesPanel();
}

// ══════════════════════════════════════════════════
// TREINO DO PLAYER
// ══════════════════════════════════════════════════
window.trainStat = async function(statKey) {
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

// ══════════════════════════════════════════════════
// RANKING
// ══════════════════════════════════════════════════
window._rankingEntities = [];

window.openRanking = function() {
    if (!window.currentWorld || !window.activePlayer) return;

    document.getElementById('ranking-modal').style.display = 'flex';
    const listEl = document.getElementById('ranking-list');
    listEl.innerHTML = '<p style="color:#8b949e; text-align:center;">Calculando poder dos heróis...</p>';

    setTimeout(() => {
        let allEntities = [];

        const pStats = Object.values(window.playerFullStats.base).reduce((a, b) => a + (parseInt(b) || 0), 0);
        allEntities.push({
            name: window.activePlayer.name + " (Você)",
            power: pStats,
            guild: "Independente",
            isPlayer: true,
            data: window.activePlayer
        });

        const worldMembers = window.currentWorld.members || [];
        const guilds = window.currentWorld.guilds || [];

        worldMembers.forEach(npc => {
            const guild = guilds.find(g => String(g.id) === String(npc.guild_id));
            let npcBase = {};
            try { npcBase = JSON.parse(npc.base_stats || '{}'); } catch(e) {}
            const npcPower = Object.values(npcBase).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
            allEntities.push({
                name: npc.name,
                power: npcPower,
                guild: guild ? guild.name : "Independente",
                isPlayer: false,
                isPrecreated: npc.is_precreated,
                data: npc
            });
        });

        allEntities.sort((a, b) => b.power - a.power);
        window._rankingEntities = allEntities;

        listEl.innerHTML = allEntities.slice(0, 50).map((h, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + 'º';
            const rowClass = h.isPlayer ? 'ranking-row-player' : '';
            return `
            <div class="ranking-row ${rowClass}" style="cursor:pointer;" onclick="openRankingCharDetail(${i})">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="rank-pos">${medal}</span>
                    <div style="display:flex; flex-direction:column;">
                        <span class="rank-name">${h.name} ${h.isPrecreated
                            ? '<span title="Herói Único" style="color:#f1c40f;font-size:0.7em;">⭐</span>'
                            : ''}</span>
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

window.openRankingCharDetail = async function(index) {
    const entity = window._rankingEntities[index];
    if (!entity) return;

    document.getElementById('char-detail-modal').style.display = 'flex';
    document.getElementById('cdm-name').innerText  = entity.name;
    document.getElementById('cdm-guild').innerText  = entity.guild;
    document.getElementById('cdm-power').innerText  = entity.power;
    document.getElementById('cdm-gold').innerText   = entity.isPlayer ? window.playerGold : (entity.data.gold || 0);

    const avatarEl = document.getElementById('cdm-avatar');
    avatarEl.innerHTML = '';
    if (entity.data.race === 'humano') {
        const dollId = `cdm-doll-${index}`;
        avatarEl.innerHTML = `<div class="paper-doll-container" id="${dollId}"
            style="transform:scale(0.8);transform-origin:top center;"></div>`;
        setTimeout(() => buildBattleCharacter(entity.data, 'f', null, dollId), 50);
    } else {
        avatarEl.innerHTML = `<img src="${entity.data.img_front || ''}"
            style="max-width:100%; max-height:100%; object-fit:contain;">`;
    }

    const statsEl = document.getElementById('cdm-stats');
    let baseStats = {};
    if (entity.isPlayer) {
        baseStats = window.playerFullStats.base;
    } else {
        try { baseStats = JSON.parse(entity.data.base_stats || '{}'); } catch(e) {}
    }

    statsEl.innerHTML = Object.entries(window.STAT_MAP.base).map(([k, name]) => `
    <div style="background:#21262d; padding:8px 12px; border-radius:5px;
        display:flex; justify-content:space-between; border:1px solid #30363d;">
        <span style="color:#bdc3c7; font-size:0.9rem;">${name}</span>
        <strong style="color:#2ecc71;">${baseStats[k] || 1}</strong>
    </div>`).join('');

    const equipsEl = document.getElementById('cdm-equips');
    let eqData = {};
    if (entity.isPlayer) {
        eqData = window.activePlayer.equipment_data || {};
        if (typeof eqData === 'string') eqData = JSON.parse(eqData);
    } else {
        try { eqData = JSON.parse(entity.data.equipment_data || '{}'); } catch(e) {}
    }

    equipsEl.innerHTML = '';
    window.EQUIP_SLOTS.forEach(slot => {
        if (slot === 'base') return;
        const itemId = eqData[slot];
        if (itemId) {
            const itemObj = window.gameData.equipments.find(e => e.id == itemId);
            if (itemObj) {
                equipsEl.innerHTML += `
                <div style="width:45px;height:45px;background:#21262d;border:1px solid #30363d;
                    border-radius:5px;display:flex;justify-content:center;align-items:center;cursor:pointer;"
                    onmouseenter="showTooltip(${itemObj.id},'equip')" onmouseleave="hideTooltip()">
                    <img src="${itemObj.img_front || ''}" style="max-width:35px;max-height:35px;object-fit:contain;">
                </div>`;
            }
        } else {
            equipsEl.innerHTML += `
            <div style="width:45px;height:45px;background:#161b22;border:1px dashed #30363d;
                border-radius:5px;display:flex;justify-content:center;align-items:center;opacity:0.5;">
                <span style="font-size:0.6rem;color:#7f8c8d;">${slot.substring(0,3).toUpperCase()}</span>
            </div>`;
        }
    });

    const skillsEl = document.getElementById('cdm-skills');
    let attacks = [];
    if (entity.isPlayer) {
        attacks = window.playerAttacks || [];
        if (typeof attacks === 'string') attacks = JSON.parse(attacks);
    } else {
        try { attacks = JSON.parse(entity.data.attacks || '[]'); } catch(e) {}
    }

    skillsEl.innerHTML = attacks.map(atkId => {
        const atk = window.gameData.attacks.find(a => a.id == atkId);
        if (!atk) return '';
        let lvl = 1;
        if (entity.isPlayer && window.attackExp && window.attackExp[atkId]) {
            lvl = window.attackExp[atkId].level;
        }
        return `<div class="hotbar-slot hb-atk-${atk.atk_type}" style="cursor:help;"
            onmouseenter="showSkillTooltip(${atk.id},event)" onmouseleave="hideSkillTooltip()">
            <span class="hb-atk-name">${atk.name}</span>
            <div class="hb-atk-lvl">Lv${lvl}</div>
        </div>`;
    }).join('');
};

// ══════════════════════════════════════════════════
// JORNAL DO MUNDO (CONSOLE)
// ══════════════════════════════════════════════════
window.openWorldLog = function(messages) {
    const modal = document.getElementById('world-log-modal');
    const list  = document.getElementById('world-log-list');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = '';

    if (!messages || messages.length === 0) {
        list.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Nada de interessante aconteceu hoje.</p>';
        return;
    }

    messages.forEach(msg => {
        if (msg === "--- Boatos do Mundo ---") {
            list.innerHTML += `
            <div style="text-align:center;margin:15px 0 5px 0;color:#f1c40f;
                border-bottom:1px solid #555;padding-bottom:5px;font-family:serif;">
                🌍 Eventos do Mundo
            </div>`;
        } else {
            list.innerHTML += `
            <div style="background:#161b22;padding:10px;border-radius:5px;
                border-left:3px solid #3498db;margin-bottom:6px;color:#ecf0f1;font-size:0.9em;">
                ${msg}
            </div>`;
        }
    });
};
