// src/js/allies.js
// Painel de Gestão de Aliados — tela dedicada acessível pelo menu principal

window._alliesFilter = 'all';
window._alliesDetailTarget = null; // { idx, ally (cópia) }

// ══════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════

/** Calcula a guilda de um aliado (via guild_members) */
function getAllyGuild(ally) {
    const members = window.gameData.guild_members || [];
    const member  = members.find(m => m.id === ally.member_id);
    if (!member) return null;
    const guilds  = window.gameData.guilds || [];
    return guilds.find(g => g.id == member.guild_id) || null;
}

/** XP necessário para o próximo nível (igual ao player) */
function allyXpRequired(level) {
    return level * 100;
}

/**
 * Calcula o custo diário real do aliado.
 * custo = daily_wage_base + soma de todos os atributos base
 */
function getAllyDailyCost(ally) {
    const baseWage = parseInt(ally.daily_wage || 0);
    const stats    = ally.base_stats || {};
    const statSum  = Object.values(stats).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    return baseWage + statSum;
}

/** Cor e label da barra de moral */
function getMoralStyle(moral) {
    moral = Math.max(0, Math.min(100, parseInt(moral) || 100));
    if (moral >= 70) return { color: '#2ecc71', label: 'Alta — Aliado motivado.' };
    if (moral >= 40) return { color: '#f1c40f', label: 'Média — Pagamentos atrasados.' };
    if (moral >= 10) return { color: '#e67e22', label: 'Baixa — Risco de abandono!' };
    return { color: '#e74c3c', label: 'Crítica — Prestes a abandonar!' };
}

// ══════════════════════════════════════════════════
// ABERTURA DA TELA
// ══════════════════════════════════════════════════
window.openAlliesPanel = async function() {
    if (!window.activePlayer) return alert('Nenhum personagem ativo!');
    await syncAlliesState();
    showTab('allies-tab', document.getElementById('btn-tab-allies'));
    renderAlliesPanel();
};

async function syncAlliesState() {
    const saves = await window.pywebview.api.get_saves();
    const save  = saves.find(s => s.id === window.activeSaveId);
    if (!save) return;
    window._currentSave = save;
    try { window._hiredAllies = JSON.parse(save.hired_allies     || '[]'); } catch(e) { window._hiredAllies = []; }
    try { window._party       = JSON.parse(save.party_data       || '[]'); } catch(e) { window._party = []; }
    try { window._repMap      = JSON.parse(save.guild_reputation || '{}'); } catch(e) { window._repMap = {}; }
}

// ══════════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════════
window.renderAlliesPanel = function() {
    const hired  = window._hiredAllies || [];
    const party  = window._party       || [];

    // Atualiza resumo do cabeçalho
    const totalCost = hired.reduce((acc, a) => acc + getAllyDailyCost(a), 0);
    const el = id => document.getElementById(id);
    if (el('as-count'))      el('as-count').innerText      = `${hired.length} aliado${hired.length !== 1 ? 's' : ''}`;
    if (el('as-party'))      el('as-party').innerText      = `Party: ${party.length + 1}/3`;
    if (el('as-daily-cost')) el('as-daily-cost').innerText = `💸 ${totalCost}/dia`;
    if (el('as-gold'))       el('as-gold').innerText       = `🪙 ${window.playerGold}`;

    // Filtra
    const search  = (el('ally-search')?.value || '').toLowerCase();
    let visible   = hired.filter((ally, idx) => {
        const matchSearch = ally.name.toLowerCase().includes(search);
        const inParty = party.includes(ally.member_id);
        const filter  = window._alliesFilter;
        if (!matchSearch) return false;
        if (filter === 'all')   return true;
        if (filter === 'party') return inParty;
        if (filter === 'idle')  return !inParty && (ally.routine === 'idle' || !ally.routine);
        if (filter === 'hunt')  return ally.routine === 'hunt';
        if (filter === 'train') return ally.routine === 'train';
        return true;
    });

    const grid = el('allies-grid');
    if (!grid) return;

    if (visible.length === 0) {
        grid.innerHTML = `<div class="allies-empty-msg">${hired.length === 0
            ? 'Nenhum aliado contratado. Visite as Guildas!'
            : 'Nenhum aliado encontrado com este filtro.'}</div>`;
        return;
    }

    grid.innerHTML = '';
    visible.forEach((ally) => {
        const realIdx  = hired.indexOf(ally);
        const inParty  = party.includes(ally.member_id);
        const guild    = getAllyGuild(ally);
        const moral    = parseInt(ally.moral ?? 100);
        const moralStyle = getMoralStyle(moral);
        const dailyCost  = getAllyDailyCost(ally);
        const routine  = inParty ? 'party' : (ally.routine || 'idle');

        const routineLabels = {
            idle:  { icon: '💤', label: 'Ocioso',   cls: 'apc-routine-idle'  },
            party: { icon: '⚔️', label: 'Na Party', cls: 'apc-routine-party' },
            hunt:  { icon: '🏹', label: 'Caçando',  cls: 'apc-routine-hunt'  },
            train: { icon: '📚', label: 'Treinando',cls: 'apc-routine-train' },
        };
        const rl = routineLabels[routine] || routineLabels.idle;

        // Badges extras
        const lowMoral = moral < 40;

        const card = document.createElement('div');
        card.className = `ally-panel-card${inParty ? ' in-party' : ''}${lowMoral ? ' low-morale' : ''}`;
        card.onclick   = () => openAllyDetail(realIdx);
        card.innerHTML = `
            <div class="apc-header">
                <div class="apc-avatar" id="apc-avatar-${realIdx}">
                    ${ally.race !== 'humano'
                        ? `<img src="${ally.img_front || ''}" style="max-width:100%; max-height:100%; object-fit:contain;">`
                        : `<div class="paper-doll-container" id="apc-doll-${realIdx}"></div>`}
                </div>
                <div class="apc-info">
                    <div class="apc-name">${ally.name}</div>
                    <div class="apc-race">${ally.race}</div>
                    ${guild
                        ? `<div class="apc-guild-badge" style="background:${guild.emblem_color}22; color:${guild.emblem_color}; border:1px solid ${guild.emblem_color}55;">${guild.emblem_icon} ${guild.name}</div>`
                        : ''}
                </div>
            </div>
            <div class="apc-routine-badge ${rl.cls}">${rl.icon} ${rl.label}</div>
            <div class="apc-moral-row">
                <span>⚖️</span>
                <div class="apc-moral-bar-bg">
                    <div class="apc-moral-bar-fill" style="width:${moral}%; background:${moralStyle.color};"></div>
                </div>
                <span style="color:${moralStyle.color}; font-weight:bold;">${moral}</span>
            </div>
            <div class="apc-cost">💸 ${dailyCost}/dia</div>
        `;
        grid.appendChild(card);
    });

    // Render paper dolls async
    visible.forEach((ally) => {
        const realIdx = hired.indexOf(ally);
        if (ally.race === 'humano') {
            setTimeout(() => {
                const fakeChar = {
                    race: ally.race,
                    equipment_data: ally.equipment_data || '{}',
                };
                buildBattleCharacter(fakeChar, 'f', null, `apc-doll-${realIdx}`);
            }, 50);
        }
    });
};

window.filterAlliesPanel = function() { renderAlliesPanel(); };
window.setAlliesFilter   = function(filter, btn) {
    window._alliesFilter = filter;
    document.querySelectorAll('.af-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAlliesPanel();
};

// ══════════════════════════════════════════════════
// MODAL DE DETALHE
// ══════════════════════════════════════════════════
window.openAllyDetail = function(idx) {
    const hired = window._hiredAllies || [];
    const ally  = hired[idx];
    if (!ally) return;

    // Cópia profunda para edição não-destrutiva
    window._alliesDetailTarget = { idx, ally: JSON.parse(JSON.stringify(ally)) };

    document.getElementById('ally-detail-modal').style.display = 'flex';
    _renderAllyDetailModal();
};

function _renderAllyDetailModal() {
    const { idx, ally } = window._alliesDetailTarget;
    const party = window._party || [];
    const inParty = party.includes(ally.member_id);
    const guild = getAllyGuild(ally);
    const moral = parseInt(ally.moral ?? 100);
    const moralStyle = getMoralStyle(moral);
    const dailyCost = getAllyDailyCost(ally);

    const $ = id => document.getElementById(id);

    // Nome
    $('ad-name').innerText = ally.name;

    // Pills de status
    let pills = `<span class="status-pill" style="background:#21262d; color:#bdc3c7;">${ally.race}</span>`;
    if (inParty) pills += `<span class="status-pill" style="background:#1a3d2b; color:#2ecc71; border:1px solid #27ae60;">⚔️ Na Party</span>`;
    $('ad-status-pills').innerHTML = pills;

    // Badge de guilda
    if (guild) {
        $('ad-guild-badge').innerHTML = `${guild.emblem_icon} ${guild.name}`;
        $('ad-guild-badge').style.background = guild.emblem_color + '22';
        $('ad-guild-badge').style.color       = guild.emblem_color;
        $('ad-guild-badge').style.border      = `1px solid ${guild.emblem_color}66`;
    } else {
        $('ad-guild-badge').innerHTML = '— Sem guilda —';
        $('ad-guild-badge').style.background = '#21262d';
        $('ad-guild-badge').style.color = '#555';
        $('ad-guild-badge').style.border = '1px solid #30363d';
    }

    // Avatar
    const dollEl = $('ad-doll-front');
    dollEl.innerHTML = '';
    if (ally.race === 'humano') {
        dollEl.style.display = 'block';
        buildBattleCharacter({ race: ally.race, equipment_data: ally.equipment_data || '{}' }, 'f', null, 'ad-doll-front');
    } else {
        dollEl.style.display = 'block';
        dollEl.innerHTML = `<img src="${ally.img_front || ''}" style="max-width:140px; max-height:140px; object-fit:contain;">`;
    }

    // Moral
    $('ad-moral-value').innerText = moral;
    $('ad-moral-value').style.color = moralStyle.color;
    $('ad-moral-fill').style.width      = `${moral}%`;
    $('ad-moral-fill').style.background = moralStyle.color;
    $('ad-moral-desc').innerText = moralStyle.label;

    // Custo diário
    const baseWage = parseInt(ally.daily_wage || 0);
    const stats    = ally.base_stats || {};
    const statSum  = Object.values(stats).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    $('ad-daily-cost').innerText       = dailyCost;
    $('ad-cost-breakdown').innerText   = `(${baseWage} base + ${statSum} atributos)`;

    // Stats resumidos
    const statsEl = $('ad-stats-list');
    statsEl.innerHTML = '';
    const statNames = window.STAT_MAP?.base || { 'for':'Força','int':'Inteligência','des':'Destreza','car':'Carisma','res':'Resistência' };
    for (const [k, name] of Object.entries(statNames)) {
        const lvl = parseInt(stats[k] || 1);
        statsEl.innerHTML += `<div class="stat-row"><span>${name}</span><strong>${lvl}</strong></div>`;
    }

    // Rotina
    const routines = [
        { key: 'idle',  icon: '💤', label: 'Descansar',   desc: 'Recupera energia, sem custo extra.', color: '#555' },
        { key: 'hunt',  icon: '🏹', label: 'Caçar',       desc: 'Traz 15–45 moedas por dia.',         color: '#e74c3c' },
        { key: 'train', icon: '📚', label: 'Treinar',      desc: '+50 XP em 1 atributo por dia.',      color: '#3498db' },
    ];
    const routineGrid = $('ad-routine-grid');
    routineGrid.innerHTML = '';
    routines.forEach(r => {
        const sel = !inParty && (ally.routine === r.key || (!ally.routine && r.key === 'idle'));
        const div = document.createElement('div');
        div.className = `routine-option${sel ? ' selected' : ''}`;
        div.style.setProperty('--routine-color', r.color);
        div.id = `ad-routine-${r.key}`;
        div.innerHTML = `<div class="ro-label">${r.icon} ${r.label}</div><div class="ro-desc">${r.desc}</div>`;
        if (!inParty) {
            div.onclick = () => _selectRoutine(r.key);
        } else {
            div.style.opacity = '0.4';
            div.style.cursor  = 'not-allowed';
            div.title          = 'Aliado está na party. Remova-o para alterar a rotina.';
        }
        routineGrid.appendChild(div);
    });

    // Seção de treino
    _renderTrainSection(inParty);

    // Party
    _renderPartySection(inParty);

    // Hotbar
    _renderAllyDetailHotbar();

    // Progresso de atributos
    _renderAttrProgress();
}

function _selectRoutine(key) {
    const { ally } = window._alliesDetailTarget;
    ally.routine = key;
    document.querySelectorAll('.routine-option').forEach(el => el.classList.remove('selected'));
    const target = document.getElementById(`ad-routine-${key}`);
    if (target) target.classList.add('selected');
    document.getElementById('ad-train-section').style.display = key === 'train' ? 'block' : 'none';
}

function _renderTrainSection(inParty) {
    const { ally } = window._alliesDetailTarget;
    const section = document.getElementById('ad-train-section');
    if (!section) return;

    const isTraining = !inParty && ally.routine === 'train';
    section.style.display = isTraining ? 'block' : 'none';

    const grid  = document.getElementById('ad-train-grid');
    if (!grid)  return;
    grid.innerHTML = '';

    const statNames = window.STAT_MAP?.base || { 'for':'FOR','int':'INT','des':'DES','car':'CAR','res':'RES' };
    const stats     = ally.base_stats  || {};
    const statExp   = ally.stat_exp    || {};
    const selectedStat = ally.train_stat || Object.keys(statNames)[0];

    for (const [k, name] of Object.entries(statNames)) {
        const lvl = parseInt(stats[k] || 1);
        const sel = selectedStat === k;
        const div = document.createElement('div');
        div.className = `train-option${sel ? ' selected' : ''}`;
        div.innerHTML = `<span>${name.substring(0,3).toUpperCase()}</span><span class="to-level">Lv${lvl}</span>`;
        div.onclick   = () => _selectTrainStat(k);
        grid.appendChild(div);
    }
}

function _selectTrainStat(key) {
    window._alliesDetailTarget.ally.train_stat = key;
    document.querySelectorAll('.train-option').forEach(el => el.classList.remove('selected'));
    const els = document.querySelectorAll('.train-option');
    const statNames = Object.keys(window.STAT_MAP?.base || { 'for':1,'int':1,'des':1,'car':1,'res':1 });
    const idx2 = statNames.indexOf(key);
    if (els[idx2]) els[idx2].classList.add('selected');
}

function _renderPartySection(inParty) {
    const { ally } = window._alliesDetailTarget;
    const party    = window._party || [];
    const section  = document.getElementById('ad-party-section');
    if (!section) return;

    if (inParty) {
        section.innerHTML = `
            <div class="ally-party-status" style="border:1px solid #27ae6055;">
                <p style="color:#2ecc71; font-weight:bold; margin-bottom:8px;">✅ ${ally.name} está na sua party.</p>
                <p style="color:#7f8c8d; font-size:0.83em; margin-bottom:10px;">Aliados na party não podem ter rotina própria.</p>
                <button class="btn-remove-party" onclick="removeFromPartyDetail()">Remover da Party</button>
            </div>`;
    } else {
        const canAdd = party.length < 2;
        section.innerHTML = `
            <div class="ally-party-status">
                <p style="color:#bdc3c7; font-size:0.85em; margin-bottom:8px;">
                    Party atual: <strong style="color:#f1c40f;">${party.length + 1}/3</strong> (você + ${party.length} aliado${party.length !== 1 ? 's' : ''})
                </p>
                ${canAdd
                    ? `<button class="btn-add-party" onclick="addToPartyDetail()">+ Adicionar à Party</button>`
                    : `<p style="color:#e74c3c; font-size:0.83em;">Party cheia! Remova um aliado primeiro.</p>`}
            </div>`;
    }
}

window.addToPartyDetail = async function() {
    const { idx, ally } = window._alliesDetailTarget;
    const party = window._party || [];
    if (party.length >= 2) return window.showToast('Party cheia!', 'error');
    if (party.includes(ally.member_id)) return;
    party.push(ally.member_id);
    window._party = party;
    await window.pywebview.api.set_party(window.activeSaveId, party);
    await window.saveGameState();
    _renderAllyDetailModal();
    renderAlliesPanel();
};

window.removeFromPartyDetail = async function() {
    const { ally } = window._alliesDetailTarget;
    window._party = (window._party || []).filter(id => id !== ally.member_id);
    await window.pywebview.api.set_party(window.activeSaveId, window._party);
    await window.saveGameState();
    _renderAllyDetailModal();
    renderAlliesPanel();
};

function _renderAllyDetailHotbar() {
    const { ally } = window._alliesDetailTarget;
    const hotbar   = ally.hotbar  || [];
    const attacks  = ally.attacks || [];
    const hbEl     = document.getElementById('ad-hotbar-grid');
    const skEl     = document.getElementById('ad-skills-list');
    if (!hbEl || !skEl) return;

    hbEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const atkId = hotbar[i] ?? null;
        const atk   = atkId ? (window.gameData.attacks || []).find(a => a.id == atkId) : null;
        hbEl.innerHTML += `
            <div class="hotbar-slot ${atk ? `hb-atk-${atk.atk_type}` : 'empty'}"
                 onclick="removeAllyDetailHotbarSlot(${i})" title="${atk ? 'Clique para remover' : 'Vazio'}">
                ${atk ? `<span class="hb-atk-name">${atk.name}</span>` : ''}
            </div>`;
    }

    skEl.innerHTML = '';
    attacks.forEach(atkId => {
        const atk = (window.gameData.attacks || []).find(a => a.id == atkId);
        if (!atk) return;
        skEl.innerHTML += `
            <div class="drag-skill-item hb-atk-${atk.atk_type}" onclick="addAllyDetailHotbarSkill(${atk.id})" title="Clique para adicionar">
                <span class="hb-atk-name">${atk.name}</span>
            </div>`;
    });
}

window.addAllyDetailHotbarSkill = function(atkId) {
    const ally = window._alliesDetailTarget?.ally;
    if (!ally) return;
    if (!ally.hotbar) ally.hotbar = [];
    const emptySlot = ally.hotbar.findIndex(s => s === null || s === undefined);
    if (emptySlot === -1 && ally.hotbar.length >= 6) return window.showToast('Barra cheia!', 'error');
    if (emptySlot === -1) ally.hotbar.push(atkId);
    else ally.hotbar[emptySlot] = atkId;
    _renderAllyDetailHotbar();
};

window.removeAllyDetailHotbarSlot = function(i) {
    const ally = window._alliesDetailTarget?.ally;
    if (!ally || !ally.hotbar) return;
    ally.hotbar[i] = null;
    _renderAllyDetailHotbar();
};

function _renderAttrProgress() {
    const { ally } = window._alliesDetailTarget;
    const stats   = ally.base_stats || {};
    const statExp = ally.stat_exp   || {};
    const el      = document.getElementById('ad-attr-progress');
    if (!el) return;
    const statNames = window.STAT_MAP?.base || { 'for':'Força','int':'Inteligência','des':'Destreza','car':'Carisma','res':'Resistência' };
    el.innerHTML = '';
    for (const [k, name] of Object.entries(statNames)) {
        const lvl  = parseInt(stats[k] || 1);
        const xp   = parseInt(statExp[k] || 0);
        const req  = allyXpRequired(lvl);
        const pct  = Math.min(100, (xp / req) * 100);
        el.innerHTML += `
            <div class="aap-row">
                <div class="aap-label">
                    <span>${name}</span>
                    <span>Lv ${lvl} — ${xp}/${req} XP</span>
                </div>
                <div class="aap-bar-bg">
                    <div class="aap-bar-fill" style="width:${pct}%;"></div>
                </div>
            </div>`;
    }
}

// ══════════════════════════════════════════════════
// SALVAR / DISPENSAR
// ══════════════════════════════════════════════════
window.saveAllyDetail = async function() {
    const { idx, ally } = window._alliesDetailTarget || {};
    if (idx === undefined) return;

    const hired = window._hiredAllies || [];
    hired[idx]  = ally;
    window._hiredAllies = hired;

    await window.pywebview.api.set_ally_routine(window.activeSaveId, ally.member_id, ally.routine || 'idle');
    await window.pywebview.api.set_ally_hotbar(window.activeSaveId, ally.member_id, ally.hotbar || []);
    // Salva stat de treino e stat_exp no aliado via sync geral
    await window.saveGameState();

    closeAllyDetail();
    renderAlliesPanel();
    window.showToast(`${ally.name} atualizado!`, 'success');
};

window.fireAllyDetail = async function() {
    const { idx, ally } = window._alliesDetailTarget || {};
    if (idx === undefined) return;

    const moral       = parseInt(ally.moral ?? 100);
    const hiringBase  = ally.original_hire_cost || 0;

    if (moral <= 0 && hiringBase > 0) {
        // Aliado já abandonou — apenas limpa sem custo
    }

    if (!confirm(`Dispensar ${ally.name}?\nEle poderá ser recontratado na guilda normalmente.`)) return;

    await window.pywebview.api.fire_ally(window.activeSaveId, ally.member_id);
    await syncAlliesState();
    await window.saveGameState();

    closeAllyDetail();
    renderAlliesPanel();
    window.showToast(`${ally.name} foi dispensado.`, 'success');
};

window.closeAllyDetail = function() {
    document.getElementById('ally-detail-modal').style.display = 'none';
    window._alliesDetailTarget = null;
};

// ══════════════════════════════════════════════════
// SISTEMA DE MORAL
// processado no healPlayer (passar de dia)
// ══════════════════════════════════════════════════

/**
 * Chamada internamente ao passar o dia.
 * Verifica pagamento e reduz moral, ou abandona.
 * Retorna mensagens sobre aliados.
 */
window.processMoralAndWages = async function() {
    const hired     = window._hiredAllies || [];
    const messages  = [];
    let   gold      = window.playerGold;
    const toFire    = [];

    for (let i = 0; i < hired.length; i++) {
        const ally     = hired[i];
        const cost     = getAllyDailyCost(ally);
        const moral    = parseInt(ally.moral ?? 100);

        if (gold >= cost) {
            // Pagamento OK — mantém moral
            gold -= cost;
        } else {
            // Não tem dinheiro — penaliza moral
            const newMoral = Math.max(0, moral - 10);
            hired[i].moral = newMoral;

            if (newMoral <= 0) {
                // Abandona
                toFire.push(ally.member_id);
                messages.push(`💔 ${ally.name} abandonou a equipe! Moral chegou a zero.`);
            } else {
                messages.push(`😤 ${ally.name} não recebeu pagamento. Moral: ${newMoral}/100`);
            }
        }
    }

    // Remove aliados que abandonaram
    const party = window._party || [];
    for (const memberId of toFire) {
        window._hiredAllies = window._hiredAllies.filter(a => a.member_id !== memberId);
        window._party = party.filter(id => id !== memberId);
        // Chama API para remover
        await window.pywebview.api.fire_ally(window.activeSaveId, memberId);
    }

    window.playerGold = gold;
    // Atualiza moral no save via saveGameState
    await window.saveGameState();
    return messages;
};

// ══════════════════════════════════════════════════
// RECONTRATAR ALIADO DE MORAL ZERO
// ══════════════════════════════════════════════════

/**
 * Modificação do hire_ally do guild.js:
 * Se o aliado tinha moral = 0 quando foi embora,
 * o custo de recontratar é o original * 5.
 * Essa lógica é aplicada no back-end (game_api.py),
 * mas sinalizamos via flag na guild.js.
 */
window.getHireCostWithMoralPenalty = function(memberId) {
    // Verifica se este membro já foi contratado e abandonou com moral 0
    // O flag é armazenado em window._firedWithZeroMoral = Set de member_ids
    if (!window._firedWithZeroMoral) window._firedWithZeroMoral = new Set();
    const members  = window.gameData.guild_members || [];
    const member   = members.find(m => m.id === memberId);
    if (!member) return 0;
    const baseCost = parseInt(member.hire_cost || 100);
    return window._firedWithZeroMoral.has(memberId) ? baseCost * 5 : baseCost;
};

// ══════════════════════════════════════════════════
// TREINO DIÁRIO DO ALIADO (integra no process_daily_routines)
// ══════════════════════════════════════════════════

/**
 * Processa o treino de um aliado (XP + level up igual ao player).
 * Chamado dentro do loop de rotinas diárias.
 */
window.processAllyDailyTrain = function(ally) {
    const trainStat = ally.train_stat;
    if (!trainStat) return null; // sem stat configurado, não faz nada

    if (!ally.stat_exp) ally.stat_exp = {};
    const XP_GAIN  = 50;
    ally.stat_exp[trainStat] = (parseInt(ally.stat_exp[trainStat] || 0)) + XP_GAIN;

    let leveledUp = false;
    while (true) {
        const curLvl = parseInt(ally.base_stats[trainStat] || 1);
        const req    = allyXpRequired(curLvl);
        if (ally.stat_exp[trainStat] >= req) {
            ally.stat_exp[trainStat] -= req;
            ally.base_stats[trainStat] = curLvl + 1;
            leveledUp = true;
        } else {
            break;
        }
    }

    const statName = window.STAT_MAP?.base[trainStat] || trainStat;
    if (leveledUp) {
        return `📚 ${ally.name} treinou ${statName} e subiu de nível! (Lv ${ally.base_stats[trainStat]})`;
    }
    return `📚 ${ally.name} treinou ${statName}. (+${XP_GAIN} XP)`;
};