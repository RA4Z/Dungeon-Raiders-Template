// frontend/src/js/guild_admin.js
// Funções de CRUD administrativo para guildas, quests e membros

// ══════════════════════════════════════════════════
// POPULA OS SELECTS DE GUILDA/PERSONAGEM
// ══════════════════════════════════════════════════
function populateGuildAdminSelects() {
    const guilds = window.gameData.guilds || [];
    const characters = window.gameData.characters || [];

    ['gq-guild-id', 'gm-guild-id'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">-- Selecione uma Guilda --</option>';
        guilds.forEach(g => sel.innerHTML += `<option value="${g.id}">${g.emblem_icon} ${g.name}</option>`);
        sel.value = cur;
    });

    const targetSel = document.getElementById('gq-target');
    if (targetSel) {
        const cur = targetSel.value;
        targetSel.innerHTML = '<option value="0">Qualquer Inimigo</option>';
        characters.forEach(c => targetSel.innerHTML += `<option value="${c.id}">${c.name} (${c.race})</option>`);
        targetSel.value = cur;
    }

    const charSel = document.getElementById('gm-char-id');
    if (charSel) {
        const cur = charSel.value;
        charSel.innerHTML = '<option value="">-- Personagem --</option>';
        characters.forEach(c => charSel.innerHTML += `<option value="${c.id}">${c.name} (${c.race})</option>`);
        charSel.value = cur;
    }
}

// Hook no buildSelects existente
const _origBuildSelects = window.buildSelects;
if (typeof _origBuildSelects === 'function') {
    window.buildSelects = function () {
        _origBuildSelects();
        populateGuildAdminSelects();
    };
} else {
    window.buildSelects = function () { populateGuildAdminSelects(); };
}

// ══════════════════════════════════════════════════
// SALVAR GUILDA
// ══════════════════════════════════════════════════
window.saveGuild = async function () {
    const editId = document.getElementById('edit-guild-id').value;
    const data = {
        name: document.getElementById('guild-name').value,
        description: document.getElementById('guild-description').value,
        emblem_color: document.getElementById('guild-color').value,
        emblem_icon: document.getElementById('guild-icon').value,
        rank_name_1: document.getElementById('guild-rank1').value || 'Recruta',
        rank_name_2: document.getElementById('guild-rank2').value || 'Veterano',
        rank_name_3: document.getElementById('guild-rank3').value || 'Elite',
        rank_name_4: document.getElementById('guild-rank4').value || 'Campeão',
        rank_name_5: document.getElementById('guild-rank5').value || 'Lendário',
    };
    if (!data.name) return window.showToast("Nome da guilda obrigatório!", "error");
    const res = editId
        ? await window.pywebview.api.update_entity('guilds', editId, data)
        : await window.pywebview.api.add_entity('guilds', data);
    if (res.status === 'success') {
        window.showToast("Guilda cadastrada e salva!", "success");
        document.getElementById('edit-guild-id').value = '';['guild-name', 'guild-description', 'guild-rank1', 'guild-rank2', 'guild-rank3', 'guild-rank4', 'guild-rank5']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = el.defaultValue || ''; });
        await window.refreshData();
        populateGuildAdminSelects();
    } else { window.showToast("Erro: " + res.message, "error"); }
};

// ══════════════════════════════════════════════════
// SALVAR QUEST
// ══════════════════════════════════════════════════
window.saveGuildQuest = async function () {
    const editId = document.getElementById('edit-gquest-id').value;
    const data = {
        guild_id: parseInt(document.getElementById('gq-guild-id').value) || 0,
        name: document.getElementById('gq-name').value,
        description: document.getElementById('gq-description').value,
        difficulty: parseInt(document.getElementById('gq-difficulty').value) || 1,
        gold_reward: parseInt(document.getElementById('gq-gold').value) || 0,
        rep_reward: parseInt(document.getElementById('gq-rep').value) || 10,
        required_kills: parseInt(document.getElementById('gq-kills').value) || 0,
        target_character_id: parseInt(document.getElementById('gq-target').value) || 0,
        time_limit_days: parseInt(document.getElementById('gq-days').value) || 0,
    };
    if (!data.name || !data.guild_id) return window.showToast("Nome e guilda são obrigatórios!", "error");
    const res = editId
        ? await window.pywebview.api.update_entity('guild_quests', editId, data)
        : await window.pywebview.api.add_entity('guild_quests', data);
    if (res.status === 'success') {
        window.showToast("Quest criada e despachada!", "success");
        document.getElementById('edit-gquest-id').value = '';['gq-name', 'gq-description'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        await window.refreshData();
    } else { window.showToast("Erro: " + res.message, "error"); }
};
// ══════════════════════════════════════════════════
// SALVAR MEMBRO
// ══════════════════════════════════════════════════
window.saveGuildMember = async function () {
    const editId = document.getElementById('edit-gmember-id').value;
    const data = {
        guild_id: parseInt(document.getElementById('gm-guild-id').value) || 0,
        character_id: parseInt(document.getElementById('gm-char-id').value) || 0,
        hire_cost: parseInt(document.getElementById('gm-hire-cost').value) || 100,
        daily_wage: parseInt(document.getElementById('gm-wage').value) || 10,
    };
    if (!data.guild_id || !data.character_id) return window.showToast("Guilda e personagem são obrigatórios!", "error");
    const res = editId
        ? await window.pywebview.api.update_entity('guild_members', editId, data)
        : await window.pywebview.api.add_entity('guild_members', data);
    if (res.status === 'success') {
        window.showToast("Novo recruta incluído na guilda!", "success");
        document.getElementById('edit-gmember-id').value = '';
        await window.refreshData();
    } else { window.showToast("Erro: " + res.message, "error"); }
};

// ══════════════════════════════════════════════════
// HOOK no editItem existente para guilds, guild_quests, guild_members
// ══════════════════════════════════════════════════
const _origEditItem = window.editItem;
window.editItem = function (table, id) {
    if (table === 'guilds') {
        const item = (window.gameData.guilds || []).find(i => i.id == id);
        if (!item) return;
        showTab('admin-tab');
        setTimeout(() => {
            document.getElementById('edit-guild-id').value = id;
            document.getElementById('guild-name').value = item.name;
            document.getElementById('guild-description').value = item.description || '';
            document.getElementById('guild-color').value = item.emblem_color || '#e74c3c';
            document.getElementById('guild-icon').value = item.emblem_icon || '⚔️';
            document.getElementById('guild-rank1').value = item.rank_name_1 || 'Recruta';
            document.getElementById('guild-rank2').value = item.rank_name_2 || 'Veterano';
            document.getElementById('guild-rank3').value = item.rank_name_3 || 'Elite';
            document.getElementById('guild-rank4').value = item.rank_name_4 || 'Campeão';
            document.getElementById('guild-rank5').value = item.rank_name_5 || 'Lendário';
        }, 100);
        return;
    }
    if (table === 'guild_quests') {
        const item = (window.gameData.guild_quests || []).find(i => i.id == id);
        if (!item) return;
        showTab('admin-tab');
        setTimeout(() => {
            populateGuildAdminSelects();
            document.getElementById('edit-gquest-id').value = id;
            document.getElementById('gq-guild-id').value = item.guild_id;
            document.getElementById('gq-name').value = item.name;
            document.getElementById('gq-description').value = item.description || '';
            document.getElementById('gq-difficulty').value = item.difficulty;
            document.getElementById('gq-gold').value = item.gold_reward;
            document.getElementById('gq-rep').value = item.rep_reward;
            document.getElementById('gq-kills').value = item.required_kills;
            document.getElementById('gq-target').value = item.target_character_id;
            document.getElementById('gq-days').value = item.time_limit_days;
        }, 150);
        return;
    }
    if (table === 'guild_members') {
        const item = (window.gameData.guild_members || []).find(i => i.id == id);
        if (!item) return;
        showTab('admin-tab');
        setTimeout(() => {
            populateGuildAdminSelects();
            document.getElementById('edit-gmember-id').value = id;
            document.getElementById('gm-guild-id').value = item.guild_id;
            document.getElementById('gm-char-id').value = item.character_id;
            document.getElementById('gm-hire-cost').value = item.hire_cost;
            document.getElementById('gm-wage').value = item.daily_wage;
        }, 150);
        return;
    }
    if (typeof _origEditItem === 'function') _origEditItem(table, id);
};

// Popula ao carregar dados
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(populateGuildAdminSelects, 500);
});