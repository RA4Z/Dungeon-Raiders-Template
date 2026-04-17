window.currentGuildId = null;
window.allyConfigTarget = null;

// ══════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════
function setGuildScreen(id) {
    document.querySelectorAll('.guild-screen').forEach(s => s.classList.remove('active-guild-screen'));
    document.getElementById(id).classList.add('active-guild-screen');
}

window.openGuilds = function () {
    if (!window.activePlayer) return alert("Nenhum personagem ativo!");
    setView('guild-screen');
    renderGuildList();
};

function backToGuildList() {
    window.currentGuildId = null;
    setGuildScreen('guild-list-screen');
    renderGuildList();
}

function switchGuildTab(tab, btn) {
    document.querySelectorAll('.guild-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.guild-tab-content').forEach(t => t.classList.remove('active-guild-tab'));
    if (btn) btn.classList.add('active');
    document.getElementById(`guild-tab-${tab}`).classList.add('active-guild-tab');

    if (tab === 'quests') renderGuildQuests();
    if (tab === 'members') renderGuildMembers();
    if (tab === 'ranking') renderGuildRanking();
}

// ══════════════════════════════════════════════════
// LISTA DE GUILDAS
// ══════════════════════════════════════════════════
function renderGuildList() {
    const container = document.getElementById('guild-cards-container');
    if (!container) return;
    const guilds = window.currentWorld.guilds ||[];
    if (guilds.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; text-align:center; margin-top:40px;">Nenhuma guilda cadastrada. Crie guildas no Banco de Dados!</p>';
        return;
    }
    try { window._repMap = JSON.parse(window.activePlayer._save?.guild_reputation || '{}'); } catch (e) { window._repMap = {}; }

    container.innerHTML = guilds.map(g => {
        const rep = parseInt(window._repMap[g.id] || 0);
        const [rankName, rankNum] = getGuildRankName(g, rep);
        return `
        <div class="guild-card" onclick="openGuildDetail('${g.id}')" style="border-color:${g.emblem_color}">
            <div class="guild-card-emblem" style="background:${g.emblem_color}22; border-color:${g.emblem_color};">${g.emblem_icon}</div>
            <div class="guild-card-info">
                <h3 style="color:${g.emblem_color};">${g.name}</h3>
                <p style="color:#bdc3c7; font-size:0.85em;">${g.description || 'Sem descrição.'}</p>
                <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                    <span style="background:#222; padding:3px 10px; border-radius:12px; font-size:0.8em; color:#f1c40f;">Rep: ${rep}</span>
                    <span style="background:${g.emblem_color}33; padding:3px 10px; border-radius:12px; font-size:0.8em; color:${g.emblem_color};">${rankName}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function getGuildRankName(guild, rep) {
    const thresholds = [[5000, 5], [2000, 4], [750, 3], [200, 2], [0, 1]];
    let rankNum = 1;
    for (const [t, n] of thresholds) { if (rep >= t) { rankNum = n; break; } }
    return [guild[`rank_name_${rankNum}`] || `Rank ${rankNum}`, rankNum];
}

// ══════════════════════════════════════════════════
// DETALHE DA GUILDA
// ══════════════════════════════════════════════════
async function openGuildDetail(guildId) {
    window.currentGuildId = guildId;
    const guild = (window.currentWorld.guilds ||[]).find(g => g.id == guildId);
    if (!guild) return;

    try { window._repMap = JSON.parse(window._currentSave?.guild_reputation || '{}'); } catch (e) { window._repMap = {}; }
    const rep = parseInt(window._repMap[guildId] || 0);
    const [rankName, rankNum] = getGuildRankName(guild, rep);

    document.getElementById('guild-detail-emblem').innerText = guild.emblem_icon;
    document.getElementById('guild-detail-name').innerText = guild.name;
    document.getElementById('guild-rep-value').innerText = rep;
    document.getElementById('guild-rep-value').style.color = rankNum >= 4 ? '#f1c40f' : rankNum >= 3 ? '#e67e22' : '#2ecc71';
    document.getElementById('guild-rank-badge').innerText = rankName;
    document.getElementById('guild-rank-badge').style.background = guild.emblem_color + '44';
    document.getElementById('guild-rank-badge').style.color = guild.emblem_color;

    setGuildScreen('guild-detail-screen');
    
    // Força a reinicialização da tab para mostrar sempre as Quests da guilda recém visitada
    const firstTabBtn = document.querySelector('.guild-tabs .guild-tab-btn');
    if (firstTabBtn) {
        switchGuildTab('quests', firstTabBtn);
    } else {
        renderGuildQuests();
    }
}

// ══════════════════════════════════════════════════
// QUESTS
// ══════════════════════════════════════════════════
function renderGuildQuests() {
    const guildId = window.currentGuildId;
    const allQuests = (window.currentWorld.quests ||[]).filter(q => q.guild_id == guildId);
    const activeQuests = window._activeQuests ||[];
    const completedQuests = window._completedQuests ||[];

    const listEl = document.getElementById('guild-quest-list');
    const activeEl = document.getElementById('guild-active-quests');
    if (!listEl || !activeEl) return;

    const DIFF_LABELS =['', '⭐ Fácil', '⭐⭐ Médio', '⭐⭐⭐ Difícil', '💀 Épico', '👑 Lendário'];
    const DIFF_COLORS =['', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6'];

    listEl.innerHTML = '';
    allQuests.forEach(q => {
        const isCompleted = completedQuests.includes(q.id);
        const isActive = activeQuests.some(aq => aq.quest_id === String(q.id));
        const diff = Math.min(5, Math.max(1, q.difficulty));
        const targetChar = q.target_character_id
            ? (window.gameData.characters ||[]).find(c => c.id == q.target_character_id)
            : null;

        listEl.innerHTML += `
        <div class="quest-card ${isCompleted ? 'quest-completed' : isActive ? 'quest-active' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong style="color:${isCompleted ? '#555' : '#f1c40f'};">${q.name}</strong>
                    <span style="margin-left:8px; font-size:0.75em; color:${DIFF_COLORS[diff]}">${DIFF_LABELS[diff]}</span>
                </div>
                <div style="text-align:right; font-size:0.8em;">
                    <span style="color:#f1c40f;">🪙 ${q.gold_reward}</span>
                    <span style="color:#3498db; margin-left:8px;">⬆ ${q.rep_reward} rep</span>
                </div>
            </div>
            <p style="color:#bdc3c7; font-size:0.82em; margin:5px 0;">${q.description || ''}</p>
            ${q.required_kills > 0 ? `<p style="font-size:0.8em; color:#e74c3c;">🎯 Kills: ${q.required_kills}x ${targetChar ? targetChar.name : 'qualquer inimigo'}</p>` : ''}
            ${q.time_limit_days > 0 ? `<p style="font-size:0.8em; color:#e67e22;">⏳ Limite: ${q.time_limit_days} dias</p>` : ''}
            <div style="margin-top:8px;">
                ${isCompleted ? '<span style="color:#555; font-size:0.8em;">✅ Completada</span>' :
                isActive ? `<button onclick="turnInQuest('${q.id}')" style="background:#2ecc71; border:none; padding:5px 12px; border-radius:4px; color:#fff; cursor:pointer; font-weight:bold; font-size:0.85em;">Entregar</button>
                                 <button onclick="abandonQuest('${q.id}')" style="background:#c0392b; border:none; padding:5px 12px; border-radius:4px; color:#fff; cursor:pointer; font-size:0.85em; margin-left:6px;">Abandonar</button>` :
                    `<button onclick="acceptQuest('${q.id}')" style="background:#2980b9; border:none; padding:5px 12px; border-radius:4px; color:#fff; cursor:pointer; font-weight:bold; font-size:0.85em;">Aceitar</button>`}
            </div>
        </div>`;
    });

    if (listEl.innerHTML === '') listEl.innerHTML = '<p style="color:#555;">Sem quests disponíveis nesta guilda.</p>';

    activeEl.innerHTML = '';
    const myActive = activeQuests.filter(aq => aq.guild_id == guildId);
    myActive.forEach(aq => {
        const q = allQuests.find(q => String(q.id) === String(aq.quest_id));
        if (!q) return;
        const req = parseInt(q.required_kills || 0);
        const done = parseInt(aq.kills_done || 0);
        const pct = req > 0 ? Math.min(100, (done / req) * 100) : 100;
        activeEl.innerHTML += `
        <div style="background:#1a252f; border:1px solid #2980b9; padding:10px; border-radius:6px;">
            <strong style="color:#3498db;">${q.name}</strong>
            ${req > 0 ? `
            <div style="margin-top:5px;">
                <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#bdc3c7; margin-bottom:3px;">
                    <span>Progresso</span><span>${done}/${req}</span>
                </div>
                <div style="background:#111; height:6px; border-radius:3px; overflow:hidden;">
                    <div style="width:${pct}%; background:#e74c3c; height:100%;"></div>
                </div>
            </div>` : '<p style="font-size:0.8em; color:#2ecc71; margin-top:4px;">Pronta para entregar!</p>'}
        </div>`;
    });
    if (activeEl.innerHTML === '') activeEl.innerHTML = '<p style="color:#555; font-size:0.9em;">Nenhuma quest ativa nesta guilda.</p>';
}

async function acceptQuest(questId) {
    const res = await window.pywebview.api.accept_quest(window.activeSaveId, questId);
    if (res.status === 'success') {
        await syncSaveState();
        renderGuildQuests();
    } else { alert(res.message); }
}

async function abandonQuest(questId) {
    if (!confirm("Abandonar esta quest?")) return;
    await window.pywebview.api.abandon_quest(window.activeSaveId, questId);
    await syncSaveState();
    renderGuildQuests();
}

async function turnInQuest(questId) {
    const res = await window.pywebview.api.turn_in_quest(window.activeSaveId, questId);
    if (res.status === 'success') {
        window.playerGold = res.new_gold;
        window.updateHUD();
        await syncSaveState();
        renderGuildQuests();
        try {
            window._repMap[window.currentGuildId] = res.new_rep;
            document.getElementById('guild-rep-value').innerText = res.new_rep;
            const guild = (window.currentWorld.guilds ||[]).find(g => g.id == window.currentGuildId);
            if (guild) {
                const [rankName] = getGuildRankName(guild, res.new_rep);
                document.getElementById('guild-rank-badge').innerText = rankName;
            }
        } catch (e) { }
        alert(`✅ Quest entregue!\n🪙 +${res.gold_reward} ouro\n⬆ +${res.rep_reward} reputação`);
    } else { alert(res.message); }
}

// ══════════════════════════════════════════════════
// MEMBROS / CONTRATAR
// ══════════════════════════════════════════════════
async function renderGuildMembers() {
    const guildId = window.currentGuildId;
    const members = (window.currentWorld.members ||[]).filter(m => String(m.guild_id) === String(guildId));
    const hired = window._hiredAllies ||[];
    const listEl = document.getElementById('guild-members-list');
    const hiredEl = document.getElementById('guild-hired-list');
    if (!listEl || !hiredEl) return;

    listEl.innerHTML = '';

    for (const m of members) {
        const char = m;
        const isHired = hired.some(a => String(a.member_id) === String(m.id));

        const costRes = await window.pywebview.api.get_ally_hire_cost(window.activeSaveId, m.id);
        const hireCost = costRes?.cost ?? m.hire_cost;
        const isPenalized = costRes?.penalized ?? false;

        let charBase = {};
        try { charBase = JSON.parse(char.base_stats || '{}'); } catch (e) { }
        const statSum = Object.values(charBase).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
        const dailyCost = parseInt(m.daily_wage || 0) + statSum;

        const guild = (window.currentWorld.guilds ||[]).find(g => String(g.id) === String(m.guild_id));

        listEl.innerHTML += `
        <div class="ally-card ${isHired ? 'ally-hired' : ''}">
            <div class="ally-avatar">
                ${char.race === 'humano'
                ? `<div class="paper-doll-container" id="ally-doll-${m.id}" style="transform:scale(0.4); transform-origin:top center; height:60px;"></div>`
                : `<img src="${char.img_front || ''}" style="height:60px; object-fit:contain;">`}
            </div>
            <strong style="color:#ecf0f1;">${char.name} ${char.is_precreated ? '⭐' : ''}</strong>
            <div style="margin:5px 0; font-size:0.82em;">
                <span style="color:${isPenalized ? '#e74c3c' : '#f1c40f'};">🪙 ${hireCost} contratar${isPenalized ? ' ⚠️ x5' : ''}</span><br>
                <span style="color:#e74c3c;">💸 ${dailyCost}/dia</span>
            </div>
            ${isHired
                ? '<span style="color:#2ecc71; font-size:0.85em; font-weight:bold;">✅ Contratado</span>'
                : `<button onclick="hireAlly('${m.id}')" style="background:#27ae60; border:none; padding:6px 12px; border-radius:4px; color:#fff; cursor:pointer; font-weight:bold; font-size:0.85em; width:100%; margin-top:5px;">Contratar</button>`}
        </div>`;
    }

    if (listEl.innerHTML === '') listEl.innerHTML = '<p style="color:#555;">Nenhum aliado disponível nesta guilda.</p>';

    members.forEach(m => {
        if (m.race === 'humano') {
            setTimeout(() => buildBattleCharacter(m, 'f', null, `ally-doll-${m.id}`), 50);
        }
    });

    // Aliados contratados
    hiredEl.innerHTML = '';
    hired.forEach((ally, idx) => {
        const routeLabels = { idle: '💤 Descansando', hunt: '⚔️ Caçando', train: '📚 Treinando' };
        const party = window._party ||[];
        const inParty = party.includes(ally.member_id);
        const moral = parseInt(ally.moral ?? 100);
        const moralColor = moral >= 70 ? '#2ecc71' : moral >= 40 ? '#f1c40f' : '#e74c3c';
        const dailyCost = parseInt(ally.daily_wage || 0) + Object.values(ally.base_stats || {}).reduce((a, v) => a + (parseInt(v) || 0), 0);

        const worldMember = (window.currentWorld.members ||[]).find(wm => String(wm.id) === String(ally.member_id));
        if (!worldMember || String(worldMember.guild_id) !== String(guildId)) return;

        hiredEl.innerHTML += `
        <div class="ally-card ally-hired" onclick="openAllyDetail(${idx})">
            <strong style="color:#e67e22;">${ally.name}</strong>
            <div style="margin:6px 0; background:#111; padding:5px; border-radius:4px; font-size:0.82em;">
                <div style="color:#3498db;">${inParty ? '⚔️ Na Party' : (routeLabels[ally.routine] || '💤 Descansando')}</div>
                <div style="color:#e74c3c;">💸 ${dailyCost}/dia</div>
                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                    <span style="color:#bdc3c7;">⚖️</span>
                    <div style="flex:1; background:#222; height:4px; border-radius:2px; overflow:hidden;">
                        <div style="width:${moral}%; background:${moralColor}; height:100%;"></div>
                    </div>
                </div>
            </div>
            <small style="color:#555; font-size:0.75em;">Clique para configurar</small>
        </div>`;
    });
}

function _getAllyGuildForDisplay(ally) {
    const members = window.currentWorld.members ||[];
    const member = members.find(m => m.id === ally.member_id);
    if (!member) return null;
    return (window.currentWorld.guilds ||[]).find(g => g.id == member.guild_id) || null;
}

async function hireAlly(memberId) {
    const res = await window.pywebview.api.hire_ally(window.activeSaveId, memberId);
    if (res.status === 'success') {
        window.playerGold = res.new_gold;
        window.updateHUD();
        await syncSaveState();
        renderGuildMembers();
        window.showToast(res.message, 'success');
    } else {
        window.showToast(res.message, 'error');
    }
}

// ══════════════════════════════════════════════════
// PARTY
// ══════════════════════════════════════════════════
async function addToParty(memberId) {
    const party = window._party ||[];
    const hired = window._hiredAllies ||[];
    const ally = hired.find(a => a.member_id === memberId);

    if (party.length >= 2) return window.showToast("Máximo de 2 aliados na party!", 'error');
    if (party.includes(memberId)) return;

    if (ally && ally.routine && ally.routine !== 'idle') {
        return window.showToast(`${ally.name} está ${ally.routine === 'hunt' ? 'caçando' : 'treinando'}. Coloque-o em modo ocioso primeiro.`, 'error');
    }

    party.push(memberId);
    window._party = party;
    await window.pywebview.api.set_party(window.activeSaveId, party);
    renderGuildMembers();
}

async function removeFromParty(memberId) {
    window._party = (window._party ||[]).filter(id => id !== memberId);
    await window.pywebview.api.set_party(window.activeSaveId, window._party);
    renderGuildMembers();
}

// ══════════════════════════════════════════════════
// CONFIGURAR ALIADO
// ══════════════════════════════════════════════════
window.openAllyConfig = function (idx) {
    if (typeof window.openAllyDetail === 'function') {
        window.openAllyDetail(idx);
        return;
    }
    const ally = (window._hiredAllies || [])[idx];
    if (!ally) return;
    window.allyConfigTarget = { idx, ally: JSON.parse(JSON.stringify(ally)) };
    document.getElementById('ally-config-modal').style.display = 'flex';
    document.getElementById('ally-config-name').innerText = `${ally.name} (${ally.race})`;
    _renderOldRoutineBtns(ally);
    renderAllyHotbar();
};

function _renderOldRoutineBtns(ally) {
    const routines =[
        { key: 'idle', label: '💤 Descansar', desc: 'Recupera energia.', color: '#555' },
        { key: 'hunt', label: '⚔️ Caçar', desc: `Traz 15–45 moedas/dia.`, color: '#e74c3c' },
        { key: 'train', label: '📚 Treinar', desc: '+50 XP em 1 atributo.', color: '#2980b9' },
    ];
    const btns = document.getElementById('routine-btns');
    if (!btns) return;
    btns.innerHTML = '';
    const party = window._party ||[];
    const inParty = party.includes(ally.member_id);
    routines.forEach(r => {
        btns.innerHTML += `
        <button onclick="${inParty ? '' : `selectRoutine('${r.key}')`}" id="routine-btn-${r.key}"
            style="background:${ally.routine === r.key ? r.color : '#222'}; border:2px solid ${r.color}; padding:10px; border-radius:6px; color:#fff; cursor:${inParty ? 'not-allowed' : 'pointer'}; text-align:left; opacity:${inParty ? 0.5 : 1}; transition:0.2s;"
            title="${inParty ? 'Aliado na party — sem rotina' : ''}">
            <div style="font-weight:bold;">${r.label}</div>
            <div style="font-size:0.78em; color:#bdc3c7;">${r.desc}</div>
        </button>`;
    });
}

window.selectRoutine = function (key) {
    if (!window.allyConfigTarget) return;
    const party = window._party ||[];
    if (party.includes(window.allyConfigTarget.ally.member_id)) {
        return window.showToast('Aliado na party não pode ter rotina.', 'error');
    }
    window.allyConfigTarget.ally.routine = key;
    const colors = { idle: '#555', hunt: '#e74c3c', train: '#2980b9' };
    document.querySelectorAll('#routine-btns button').forEach(b => {
        const k = b.id.replace('routine-btn-', '');
        b.style.background = k === key ? colors[k] : '#222';
    });
};

function renderAllyHotbar() {
    const ally = window.allyConfigTarget?.ally;
    if (!ally) return;
    const hotbar = ally.hotbar ||[];
    const attacks = ally.attacks ||[];
    const hbEl = document.getElementById('ally-config-hotbar');
    const skEl = document.getElementById('ally-config-skills');
    if (!hbEl || !skEl) return;

    hbEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const atkId = hotbar[i] ?? null;
        const atk = atkId ? (window.gameData.attacks ||[]).find(a => a.id == atkId) : null;
        hbEl.innerHTML += `
        <div class="hotbar-slot ${atk ? `hb-atk-${atk.atk_type}` : 'empty'}" 
             onclick="removeAllyHotbarSlot(${i})" title="${atk ? 'Clique para remover' : 'Vazio'}">
            ${atk ? `<span class="hb-atk-name">${atk.name}</span>` : ''}
        </div>`;
    }

    skEl.innerHTML = '';
    attacks.forEach(atkId => {
        const atk = (window.gameData.attacks ||[]).find(a => a.id == atkId);
        if (!atk) return;
        skEl.innerHTML += `
        <div class="drag-skill-item hb-atk-${atk.atk_type}" onclick="addAllyHotbarSkill(${atk.id})" title="Clique para adicionar à barra">
            <span class="hb-atk-name">${atk.name}</span>
        </div>`;
    });
}

window.addAllyHotbarSkill = function (atkId) {
    const ally = window.allyConfigTarget?.ally;
    if (!ally) return;
    if (!ally.hotbar) ally.hotbar =[];
    const emptySlot = ally.hotbar.findIndex(s => s === null || s === undefined);
    if (emptySlot === -1 && ally.hotbar.length >= 6) return alert("Barra cheia!");
    if (emptySlot === -1) ally.hotbar.push(atkId);
    else ally.hotbar[emptySlot] = atkId;
    renderAllyHotbar();
};

window.removeAllyHotbarSlot = function (idx) {
    const ally = window.allyConfigTarget?.ally;
    if (!ally || !ally.hotbar) return;
    ally.hotbar[idx] = null;
    renderAllyHotbar();
};

window.saveAllyConfig = async function () {
    const { idx, ally } = window.allyConfigTarget || {};
    if (idx === undefined) return;
    const hired = window._hiredAllies || [];
    hired[idx] = ally;
    window._hiredAllies = hired;
    await window.pywebview.api.set_ally_routine(window.activeSaveId, ally.member_id, ally.routine);
    await window.pywebview.api.set_ally_hotbar(window.activeSaveId, ally.member_id, ally.hotbar ||[]);
    await syncSaveState();
    closeAllyConfig();
    renderGuildMembers();
};

window.fireAlly = async function () {
    const { idx, ally } = window.allyConfigTarget || {};
    if (idx === undefined) return;
    if (!confirm(`Dispensar ${ally.name}?`)) return;
    await window.pywebview.api.fire_ally(window.activeSaveId, ally.member_id);
    await syncSaveState();
    closeAllyConfig();
    renderGuildMembers();
};

window.closeAllyConfig = function () {
    document.getElementById('ally-config-modal').style.display = 'none';
    window.allyConfigTarget = null;
};

// ══════════════════════════════════════════════════
// RANKING DE REP
// ══════════════════════════════════════════════════
function renderGuildRanking() {
    const guild = (window.currentWorld.guilds ||[]).find(g => String(g.id) === String(window.currentGuildId));
    if (!guild) return;
    const el = document.getElementById('guild-ranking-ladder');
    if (!el) return;

    const rep = parseInt(window._repMap?.[guild.id] || 0);

    const ranks =[
        { req: 0, label: guild.rank_name_1 || "Iniciante", color: '#7f8c8d' },
        { req: 500, label: guild.rank_name_2 || "Veterano", color: '#2ecc71' },
        { req: 1500, label: guild.rank_name_3 || "Elite", color: '#3498db' },
        { req: 4000, label: guild.rank_name_4 || "Mestre", color: '#e67e22' },
        { req: 10000, label: guild.rank_name_5 || "Lendário", color: '#f1c40f' }
    ];

    el.innerHTML = ranks.slice().reverse().map(r => {
        const achieved = rep >= r.req;
        const pct = r.req === 0 ? 100 : Math.min(100, (rep / r.req) * 100);
        return `
        <div style="display:flex; align-items:center; gap:12px; background:${achieved ? r.color + '15' : '#111'}; padding:12px; border-radius:8px; border:1px solid ${achieved ? r.color : '#333'}; opacity:${achieved ? 1 : 0.6};">
            <div style="font-size:1.5rem;">${achieved ? '✅' : '🔒'}</div>
            <div style="flex:1;">
                <div style="font-weight:bold; color:${achieved ? r.color : '#555'};">${r.label}</div>
                <div style="font-size:0.75em; color:#7f8c8d;">Reputação: ${rep} / ${r.req}</div>
                ${!achieved ? `
                <div style="background:#222; height:4px; border-radius:2px; margin-top:5px; overflow:hidden;">
                    <div style="width:${pct}%; background:${r.color}; height:100%;"></div>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}


// ══════════════════════════════════════════════════
// HELPER: Sincroniza estado do save
// ══════════════════════════════════════════════════
async function syncSaveState() {
    const saves = await window.pywebview.api.get_saves();
    const save = saves.find(s => s.id === window.activeSaveId);
    if (!save) return;
    window._currentSave = save;
    try { window._repMap = JSON.parse(save.guild_reputation || '{}'); } catch (e) { window._repMap = {}; }
    try { window._activeQuests = JSON.parse(save.active_quests || '[]'); } catch (e) { window._activeQuests =[]; }
    try { window._completedQuests = JSON.parse(save.completed_quests || '[]'); } catch (e) { window._completedQuests =[]; }
    try { window._hiredAllies = JSON.parse(save.hired_allies || '[]'); } catch (e) { window._hiredAllies =[]; }
    try { window._party = JSON.parse(save.party_data || '[]'); } catch (e) { window._party =[]; }
}