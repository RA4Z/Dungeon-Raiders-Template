// frontend/src/js/guild_admin.js
// Responsável pelo CRUD de Guildas, Quests e Membros dentro da Forja.
// Depende de: admin.js (editItem, deleteItem), forge.html (IDs dos forms)

// ══════════════════════════════════════════════════
// SALVAR GUILDA
// ══════════════════════════════════════════════════
window.saveGuild = async function () {
    const editId = document.getElementById('edit-guild-id')?.value;
    const data = {
        name:        document.getElementById('guild-name')?.value?.trim(),
        description: document.getElementById('guild-description')?.value?.trim() || '',
        emblem_color: document.getElementById('guild-color')?.value || '#e74c3c',
        emblem_icon:  document.getElementById('guild-icon')?.value?.trim() || '⚔️',
        rank_name_1:  document.getElementById('guild-rank1')?.value?.trim() || 'Recruta',
        rank_name_2:  document.getElementById('guild-rank2')?.value?.trim() || 'Veterano',
        rank_name_3:  document.getElementById('guild-rank3')?.value?.trim() || 'Elite',
        rank_name_4:  document.getElementById('guild-rank4')?.value?.trim() || 'Campeão',
        rank_name_5:  document.getElementById('guild-rank5')?.value?.trim() || 'Lendário',
    };

    if (!data.name) return window.showToast('Nome da guilda é obrigatório!', 'error');

    const res = editId
        ? await window.pywebview.api.update_entity('guilds', editId, data)
        : await window.pywebview.api.add_entity('guilds', data);

    if (res.status === 'success') {
        window.showToast(editId ? 'Guilda atualizada!' : 'Guilda criada!', 'success');
        window.clearGuildForgeForm('guild');
        await window.refreshData();
        // Atualiza listas na forja
        if (typeof renderForgeGuildList === 'function') renderForgeGuildList();
        if (typeof populateGuildForgeSelects === 'function') populateGuildForgeSelects();
    } else {
        window.showToast('Erro: ' + res.message, 'error');
    }
};

// ══════════════════════════════════════════════════
// SALVAR QUEST DE GUILDA
// ══════════════════════════════════════════════════
window.saveGuildQuest = async function () {
    const editId = document.getElementById('edit-gquest-id')?.value;
    const data = {
        guild_id:            parseInt(document.getElementById('gq-guild-id')?.value)    || 0,
        name:                document.getElementById('gq-name')?.value?.trim(),
        description:         document.getElementById('gq-description')?.value?.trim()   || '',
        difficulty:          parseInt(document.getElementById('gq-difficulty')?.value)  || 1,
        gold_reward:         parseInt(document.getElementById('gq-gold')?.value)         || 0,
        rep_reward:          parseInt(document.getElementById('gq-rep')?.value)          || 10,
        required_kills:      parseInt(document.getElementById('gq-kills')?.value)        || 0,
        target_character_id: parseInt(document.getElementById('gq-target')?.value)       || 0,
        time_limit_days:     parseInt(document.getElementById('gq-days')?.value)         || 0,
    };

    if (!data.name)     return window.showToast('Nome da quest é obrigatório!', 'error');
    if (!data.guild_id) return window.showToast('Selecione uma guilda!', 'error');

    const res = editId
        ? await window.pywebview.api.update_entity('guild_quests', editId, data)
        : await window.pywebview.api.add_entity('guild_quests', data);

    if (res.status === 'success') {
        window.showToast(editId ? 'Quest atualizada!' : 'Quest criada!', 'success');
        window.clearGuildForgeForm('quest');
        await window.refreshData();
        if (typeof renderForgeQuestList === 'function') renderForgeQuestList();
    } else {
        window.showToast('Erro: ' + res.message, 'error');
    }
};

// ══════════════════════════════════════════════════
// SALVAR MEMBRO DE GUILDA
// ══════════════════════════════════════════════════
window.saveGuildMember = async function () {
    const editId = document.getElementById('edit-gmember-id')?.value;
    const data = {
        guild_id:     parseInt(document.getElementById('gm-guild-id')?.value)   || 0,
        character_id: parseInt(document.getElementById('gm-char-id')?.value)    || 0,
        hire_cost:    parseInt(document.getElementById('gm-hire-cost')?.value)  || 100,
        daily_wage:   parseInt(document.getElementById('gm-wage')?.value)       || 10,
    };

    if (!data.guild_id)     return window.showToast('Selecione uma guilda!', 'error');
    if (!data.character_id) return window.showToast('Selecione um personagem!', 'error');

    const res = editId
        ? await window.pywebview.api.update_entity('guild_members', editId, data)
        : await window.pywebview.api.add_entity('guild_members', data);

    if (res.status === 'success') {
        window.showToast(editId ? 'Aliado atualizado!' : 'Aliado adicionado à guilda!', 'success');
        window.clearGuildForgeForm('member');
        await window.refreshData();
        if (typeof renderForgeMemberList === 'function') renderForgeMemberList();
    } else {
        window.showToast('Erro: ' + res.message, 'error');
    }
};

// ══════════════════════════════════════════════════
// EXTENSÃO DO editItem para tabelas de guilda
// ══════════════════════════════════════════════════
// Guarda referência ao editItem original do admin.js
const _baseEditItem = window.editItem;

window.editItem = function (table, id) {

    // ── Guilda ──────────────────────────────────────
    if (table === 'guilds') {
        const item = (window.gameData?.guilds || []).find(i => i.id == id);
        if (!item) return;
        // Navega para a aba correta
        showTab('admin-tab');
        setTimeout(() => {
            window.switchForgeTab('guilds', null);
            // Seta sub-seção
            window.switchGuildForgeSection('guilds-form', null);
            // Preenche o formulário
            document.getElementById('edit-guild-id').value   = id;
            document.getElementById('guild-name').value      = item.name;
            document.getElementById('guild-description').value = item.description || '';
            document.getElementById('guild-color').value     = item.emblem_color  || '#e74c3c';
            document.getElementById('guild-icon').value      = item.emblem_icon   || '⚔️';
            document.getElementById('guild-rank1').value     = item.rank_name_1   || 'Recruta';
            document.getElementById('guild-rank2').value     = item.rank_name_2   || 'Veterano';
            document.getElementById('guild-rank3').value     = item.rank_name_3   || 'Elite';
            document.getElementById('guild-rank4').value     = item.rank_name_4   || 'Campeão';
            document.getElementById('guild-rank5').value     = item.rank_name_5   || 'Lendário';
            // Dispara o preview do emblema
            ['guild-name','guild-description','guild-color','guild-icon'].forEach(elId => {
                document.getElementById(elId)?.dispatchEvent(new Event('input'));
            });
        }, 150);
        return;
    }

    // ── Quest de Guilda ─────────────────────────────
    if (table === 'guild_quests') {
        const item = (window.gameData?.guild_quests || []).find(i => i.id == id);
        if (!item) return;
        showTab('admin-tab');
        setTimeout(() => {
            window.switchForgeTab('guilds', null);
            window.switchGuildForgeSection('quests-form', null);
            populateGuildForgeSelects();
            document.getElementById('edit-gquest-id').value    = id;
            document.getElementById('gq-guild-id').value       = item.guild_id;
            document.getElementById('gq-name').value           = item.name;
            document.getElementById('gq-description').value    = item.description    || '';
            document.getElementById('gq-difficulty').value     = item.difficulty;
            document.getElementById('gq-gold').value           = item.gold_reward;
            document.getElementById('gq-rep').value            = item.rep_reward;
            document.getElementById('gq-kills').value          = item.required_kills;
            document.getElementById('gq-target').value         = item.target_character_id;
            document.getElementById('gq-days').value           = item.time_limit_days;
        }, 150);
        return;
    }

    // ── Membro de Guilda ────────────────────────────
    if (table === 'guild_members') {
        const item = (window.gameData?.guild_members || []).find(i => i.id == id);
        if (!item) return;
        showTab('admin-tab');
        setTimeout(() => {
            window.switchForgeTab('guilds', null);
            window.switchGuildForgeSection('members-form', null);
            populateGuildForgeSelects();
            document.getElementById('edit-gmember-id').value   = id;
            document.getElementById('gm-guild-id').value       = item.guild_id;
            document.getElementById('gm-char-id').value        = item.character_id;
            document.getElementById('gm-hire-cost').value      = item.hire_cost;
            document.getElementById('gm-wage').value           = item.daily_wage;
        }, 150);
        return;
    }

    // Delega tudo o mais para o admin.js original
    if (typeof _baseEditItem === 'function') _baseEditItem(table, id);
};

// ══════════════════════════════════════════════════
// EXTENSÃO DO deleteItem — atualiza listas da forja
// ══════════════════════════════════════════════════
const _baseDeleteItem = window.deleteItem;
window.deleteItem = async function (table, id) {
    if (!confirm('Deseja apagar este item permanentemente?')) return;
    await window.pywebview.api.delete_entity(table, id);
    await window.refreshData();
    if (typeof renderCrudTable === 'function') renderCrudTable();

    const refreshMap = {
        bodies:         () => typeof renderForgeBodyList  === 'function' && renderForgeBodyList(),
        equipments:     () => typeof renderForgeEquipList === 'function' && renderForgeEquipList(),
        consumables:    () => typeof renderForgeConsList  === 'function' && renderForgeConsList(),
        attacks:        () => typeof renderForgeAtkList   === 'function' && renderForgeAtkList(),
        equipment_sets: () => typeof renderForgeSetsPanel === 'function' && renderForgeSetsPanel(),
        guilds:         () => { if (typeof renderForgeGuildList  === 'function') renderForgeGuildList();  if (typeof populateGuildForgeSelects === 'function') populateGuildForgeSelects(); },
        guild_quests:   () => typeof renderForgeQuestList  === 'function' && renderForgeQuestList(),
        guild_members:  () => typeof renderForgeMemberList === 'function' && renderForgeMemberList(),
    };
    refreshMap[table]?.();
};

// ══════════════════════════════════════════════════
// Hook no buildSelects para popular selects de guilda
// ══════════════════════════════════════════════════
const _origBuildSelects = window.buildSelects;
window.buildSelects = function () {
    if (typeof _origBuildSelects === 'function') _origBuildSelects();
    if (typeof populateGuildForgeSelects === 'function') populateGuildForgeSelects();
};