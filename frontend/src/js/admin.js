// frontend/src/js/admin.js

window._currentDbTable = 'characters';
window._dbAllRows = [];

window.DB_COL_LABELS = {
    id: 'ID', name: 'Nome', race: 'Raça', img_front: 'Img Frente', img_back: 'Img Verso',
    equipment_data: 'Equipamentos', custom_drops: 'Drops', base_stats: 'Atributos',
    custom_substats: 'Sub-Status', attacks: 'Ataques', power_score: 'Poder',
    type: 'Tipo', drop_chance: 'Drop%', stats_modifiers: 'Modificadores',
    effect_type: 'Efeito', effect_value: 'Valor', img_path: 'Imagem',
    is_playable: 'Jogável?', atk_type: 'Tipo Atk', base_power: 'Poder Base',
    hp_cost: 'Custo HP', mana_cost: 'Custo Mana', stamina_cost: 'Custo Stamina',
    description: 'Descrição', scaling: 'Escala', emblem_color: 'Cor',
    emblem_icon: 'Ícone', rank_name_1: 'Rank 1', rank_name_2: 'Rank 2',
    rank_name_3: 'Rank 3', rank_name_4: 'Rank 4', rank_name_5: 'Rank 5',
    guild_id: 'Guilda', difficulty: 'Dificuldade', gold_reward: '🪙 Ouro',
    rep_reward: '⭐ Rep', required_kills: 'Kills', target_character_id: 'Alvo',
    time_limit_days: 'Limite Dias', character_id: 'Personagem',
    hire_cost: '🪙 Contratar', daily_wage: '💸 Salário/dia',
};

const DB_HIDDEN_COLS = {
    characters: ['img_front','img_back','equipment_data','custom_drops','custom_substats'],
    equipments: ['img_front','img_back','stats_modifiers'],
    consumables: ['img_path'],
    bodies: ['img_front','img_back'],
    attacks: ['scaling','description'],
    guilds: ['rank_name_1','rank_name_2','rank_name_3','rank_name_4','rank_name_5'],
};

// ══════════════════════════════════════════════════
// LÓGICA DA FORJA (TROCA DE ABAS)
// ══════════════════════════════════════════════════
let _currentSetBonusTab = 2;
let _setBonus = { 2:{}, 3:{}, 4:{}, 5:{}, 6:{} };

window.switchForgeTab = function(tab, btnEl) {
    document.querySelectorAll('.forge-tab-content').forEach(el => el.classList.remove('active-forge-tab'));
    document.querySelectorAll('.forge-nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`forge-tab-${tab}`);
    if (target) target.classList.add('active-forge-tab');
    if (btnEl) btnEl.classList.add('active');

    if (tab === 'equipments') { renderForgeEquipList(); populateSetSelect(); }
    if (tab === 'bodies')     renderForgeBodyList();
    if (tab === 'consumables') renderForgeConsList();
    if (tab === 'attacks')    renderForgeAtkList();
    if (tab === 'sets')       { renderForgeSetsPanel(); renderForgeSetBonusTab(); }
};

// ══════════════════════════════════════════════════
// LÓGICA DO BANCO DE DADOS
// ══════════════════════════════════════════════════
window.selectDbCategory = function(table, btnEl) {
    window._currentDbTable = table;
    document.querySelectorAll('.db-cat-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const searchInput = document.getElementById('db-search-input');
    if (searchInput) searchInput.value = '';
    renderCrudTable();
};

window.renderCellValue = function(table, key, val) {
    if (val === null || val === undefined) return '<span style="color:#555;">—</span>';
    const str = String(val);
    if (key === 'is_playable') return val == 1 ? '<span style="color:#2ecc71;">✓ Sim</span>' : '<span style="color:#555;">Não</span>';
    if (key === 'atk_type') return val === 'phys' ? '⚔️ Físico' : '✨ Mágico';
    if (str.length > 35) return str.substring(0,35) + '...';
    return str;
};

window.filterDbTable = function() {
    const q = document.getElementById('db-search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#crud-tbody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
};

// ══════════════════════════════════════════════════
// RESTO DAS FUNÇÕES (EQUIPAMENTOS, CORPOS, ETC)
// ══════════════════════════════════════════════════

// ── Salvar Corpo ─────────────────────────────────
async function saveBody() {
    const editId = document.getElementById('edit-bd-id').value;
    const data = {
        name:        document.getElementById('bd-name').value,
        img_front:   document.getElementById('bd-img-f').value,
        img_back:    document.getElementById('bd-img-b').value,
        img_front_f: document.getElementById('bd-img-f-f')?.value || '',
        img_back_f:  document.getElementById('bd-img-b-f')?.value || '',
        is_playable: document.getElementById('bd-playable')?.checked ? 1 : 0,
    };
    if (!data.name) return window.showToast("Preencha o nome do corpo!", "error");

    if (editId) await window.pywebview.api.update_entity('bodies', editId, data);
    else        await window.pywebview.api.add_entity('bodies', data);

    window.showToast("Corpo salvo!", "success");
    if (typeof clearForgeForm === 'function') clearForgeForm('body');
    await window.refreshData();
    if (typeof renderForgeBodyList === 'function') renderForgeBodyList();
}

// ── Salvar Equipamento ───────────────────────────
async function saveEquipment() {
    let mods = {};
    document.querySelectorAll('.stat-mod-input').forEach(i => {
        if (i.value && i.value != "0") mods[i.dataset.stat] = parseFloat(i.value);
    });

    const editId = document.getElementById('edit-eq-id').value;
    const data = {
        name:        document.getElementById('eq-name').value,
        type:        document.getElementById('eq-type').value,
        img_front:   document.getElementById('eq-img-f').value,
        img_back:    document.getElementById('eq-img-b').value,
        img_front_f: document.getElementById('eq-img-f-f')?.value || '',
        img_back_f:  document.getElementById('eq-img-b-f')?.value || '',
        gender:      document.getElementById('eq-gender')?.value || 'both',
        set_id:      parseInt(document.getElementById('eq-set-id')?.value || '0'),
        drop_chance: parseInt(document.getElementById('eq-drop').value) || 5,
        stats_modifiers: JSON.stringify(mods),
    };
    if (!data.name) return window.showToast("Nome obrigatório!", "error");

    if (editId) await window.pywebview.api.update_entity('equipments', editId, data);
    else        await window.pywebview.api.add_entity('equipments', data);

    window.showToast("Equipamento forjado!", "success");
    if (typeof clearForgeForm === 'function') clearForgeForm('equip');
    window.renderForgeStats();
    await window.refreshData();
    if (typeof renderForgeEquipList === 'function') renderForgeEquipList();
}

// ── Salvar Consumível ────────────────────────────
async function saveConsumable() {
    const editId = document.getElementById('edit-cons-id').value;
    const data = {
        name:         document.getElementById('cons-name').value,
        effect_type:  document.getElementById('cons-type').value,
        effect_value: parseInt(document.getElementById('cons-value').value) || 0,
        img_path:     document.getElementById('cons-img').value,
        drop_chance:  parseInt(document.getElementById('cons-drop').value) || 20,
    };
    if (!data.name) return window.showToast("Nome obrigatório!", "error");

    if (editId) await window.pywebview.api.update_entity('consumables', editId, data);
    else        await window.pywebview.api.add_entity('consumables', data);

    window.showToast("Consumível salvo!", "success");
    if (typeof clearForgeForm === 'function') clearForgeForm('cons');
    await window.refreshData();
    if (typeof renderForgeConsList === 'function') renderForgeConsList();
}

// ── Salvar Habilidade ────────────────────────────
async function saveAttack() {
    const editId = document.getElementById('edit-atk-id').value;
    let scaling = {};
    document.querySelectorAll('.atk-scale-input').forEach(i => {
        const val = parseFloat(i.value);
        if (val > 0) scaling[i.dataset.stat] = val;
    });

    const data = {
        name:         document.getElementById('atk-name').value,
        atk_type:     document.getElementById('atk-type').value,
        hp_cost:      parseInt(document.getElementById('atk-hp-cost').value) || 0,
        mana_cost:    parseInt(document.getElementById('atk-mana-cost').value) || 0,
        stamina_cost: parseInt(document.getElementById('atk-stamina-cost').value) || 0,
        description:  document.getElementById('atk-description').value,
        base_power:   parseFloat(document.getElementById('atk-base').value) || 0,
        scaling:      JSON.stringify(scaling),
    };
    if (!data.name) return window.showToast("Nome obrigatório!", "error");

    if (editId) await window.pywebview.api.update_entity('attacks', editId, data);
    else        await window.pywebview.api.add_entity('attacks', data);

    window.showToast("Habilidade registrada!", "success");
    if (typeof clearForgeForm === 'function') clearForgeForm('atk');
    await window.refreshData();
    if (typeof renderForgeAtkList === 'function') renderForgeAtkList();
}

// ── CRUD Table (Database tab) ────────────────────
async function renderCrudTable() {
    // Compatibilidade: usa window._currentDbTable se existir, senão fallback para o select legado
    let table = window._currentDbTable;
    if (!table) {
        const sel = document.getElementById('crud-table-select');
        table = sel ? sel.value : 'characters';
        window._currentDbTable = table;
    }

    const data  = window.gameData?.[table] || [];
    const thead = document.getElementById('crud-thead');
    const tbody = document.getElementById('crud-tbody');
    if (!thead || !tbody) return;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Atualiza badge de registros
    const badge = document.getElementById('db-record-count');
    if (badge) badge.innerText = `${data.length} registro${data.length !== 1 ? 's' : ''}`;

    const emptyState = document.getElementById('db-empty-state');
    const mainTable  = document.getElementById('db-main-table');

    if (data.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (mainTable)  mainTable.style.display  = 'none';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (mainTable)  mainTable.style.display  = '';

    // Colunas a ocultar
    const HIDDEN = {
        characters:    ['img_front','img_back','equipment_data','custom_drops','custom_substats'],
        equipments:    ['img_front','img_back','img_front_f','img_back_f','stats_modifiers'],
        consumables:   ['img_path'],
        bodies:        ['img_front','img_back','img_front_f','img_back_f'],
        attacks:       ['scaling','description'],
        guilds:        ['rank_name_1','rank_name_2','rank_name_3','rank_name_4','rank_name_5'],
        guild_quests:  [],
        guild_members: [],
        equipment_sets:['bonus_2','bonus_3','bonus_4','bonus_5','bonus_6'],
    };
    const hidden = HIDDEN[table] || [];
    const keys   = Object.keys(data[0]).filter(k => !hidden.includes(k));

    keys.forEach(k => {
        const th = document.createElement('th');
        th.innerText = DB_COL_LABELS?.[k] || k;
        thead.appendChild(th);
    });
    const thAct = document.createElement('th');
    thAct.innerText = 'Ações';
    thAct.style.width = '100px';
    thead.appendChild(thAct);

    data.forEach((row, ri) => {
        const tr = document.createElement('tr');
        tr.className = ri % 2 === 0 ? 'db-row-even' : 'db-row-odd';
        keys.forEach(k => {
            const td = document.createElement('td');
            if (typeof renderCellValue === 'function') {
                td.innerHTML = renderCellValue(table, k, row[k]);
            } else {
                let val = String(row[k] ?? '');
                td.textContent = val.length > 35 ? val.substring(0, 35) + '…' : val;
            }
            tr.appendChild(td);
        });
        const tdAct = document.createElement('td');
        tdAct.className = 'db-actions-cell';
        tdAct.innerHTML = `
            <button class="db-btn-edit" onclick="editItem('${table}', ${row.id})" title="Editar">✏️</button>
            <button class="db-btn-del"  onclick="deleteItem('${table}', ${row.id})" title="Deletar">🗑️</button>
        `;
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
    });

    if (typeof filterDbTable === 'function') filterDbTable();
}

// ── Edit / Delete ────────────────────────────────
window.editItem = function(table, id) {
    const item = (window.gameData?.[table] || []).find(i => i.id == id);
    if (!item) return;

    const forgeTabMap = {
        bodies: 'bodies', equipments: 'equipments',
        consumables: 'consumables', attacks: 'attacks',
        equipment_sets: 'sets',
    };

    if (forgeTabMap[table]) {
        showTab('admin-tab');
        setTimeout(() => {
            if (typeof switchForgeTab === 'function')
                switchForgeTab(forgeTabMap[table], null);
        }, 80);
    } else if (table === 'characters') {
        showTab('char-tab');
    }

    setTimeout(() => {
        if (table === 'bodies') {
            document.getElementById('edit-bd-id').value    = id;
            document.getElementById('bd-name').value       = item.name;
            document.getElementById('bd-img-f').value      = item.img_front    || '';
            document.getElementById('bd-img-b').value      = item.img_back     || '';
            const ffEl = document.getElementById('bd-img-f-f'); if(ffEl) ffEl.value = item.img_front_f || '';
            const bfEl = document.getElementById('bd-img-b-f'); if(bfEl) bfEl.value = item.img_back_f  || '';
            const ck   = document.getElementById('bd-playable'); if(ck) ck.checked = (item.is_playable == 1);
            ['bd-img-f','bd-img-b','bd-img-f-f','bd-img-b-f'].forEach((inputId, i) => {
                const prevIds = ['prev-bd-f','prev-bd-b','prev-bd-ff','prev-bd-bf'];
                window.updateMiniPrev(inputId, prevIds[i]);
            });
        }
        else if (table === 'equipments') {
            document.getElementById('edit-eq-id').value   = id;
            document.getElementById('eq-name').value      = item.name;
            document.getElementById('eq-type').value      = item.type;
            document.getElementById('eq-img-f').value     = item.img_front    || '';
            document.getElementById('eq-img-b').value     = item.img_back     || '';
            const ffEl = document.getElementById('eq-img-f-f'); if(ffEl) ffEl.value = item.img_front_f || '';
            const bfEl = document.getElementById('eq-img-b-f'); if(bfEl) bfEl.value = item.img_back_f  || '';
            const gEl  = document.getElementById('eq-gender');  if(gEl)  gEl.value  = item.gender      || 'both';
            const sEl  = document.getElementById('eq-set-id');  if(sEl)  sEl.value  = item.set_id      || '0';
            document.getElementById('eq-drop').value      = item.drop_chance;
            let mods = {};
            try { mods = JSON.parse(item.stats_modifiers || '{}'); } catch {}
            document.querySelectorAll('.stat-mod-input').forEach(i => i.value = mods[i.dataset.stat] || 0);
        }
        else if (table === 'consumables') {
            document.getElementById('edit-cons-id').value  = id;
            document.getElementById('cons-name').value     = item.name;
            document.getElementById('cons-type').value     = item.effect_type;
            document.getElementById('cons-value').value    = item.effect_value;
            document.getElementById('cons-img').value      = item.img_path || '';
            document.getElementById('cons-drop').value     = item.drop_chance;
        }
        else if (table === 'attacks') {
            document.getElementById('edit-atk-id').value          = id;
            document.getElementById('atk-name').value             = item.name;
            document.getElementById('atk-type').value             = item.atk_type;
            document.getElementById('atk-hp-cost').value          = item.hp_cost     || 0;
            document.getElementById('atk-mana-cost').value        = item.mana_cost   || 0;
            document.getElementById('atk-stamina-cost').value     = item.stamina_cost || 5;
            document.getElementById('atk-description').value      = item.description || '';
            document.getElementById('atk-base').value             = item.base_power;
            let scaling = {};
            try { scaling = JSON.parse(item.scaling || '{}'); } catch {}
            document.querySelectorAll('.atk-scale-input').forEach(i => i.value = scaling[i.dataset.stat] || 0);
        }
        else if (table === 'equipment_sets') {
            if (typeof editSetItem === 'function') editSetItem(id);
        }
        else if (table === 'characters') {
            document.getElementById('edit-char-id').value = id;
            document.getElementById('ch-name').value      = item.name;
            document.getElementById('ch-race').value      = item.race;
            let base = {};
            try { base = JSON.parse(item.base_stats || '{}'); } catch {}
            document.querySelectorAll('.char-base-stat').forEach(i => i.value = base[i.dataset.stat] || 1);
            if (item.race === 'monstro') {
                document.getElementById('ch-img-f').value = item.img_front;
                document.getElementById('ch-img-b').value = item.img_back;
                let subs = {};
                try { subs = JSON.parse(item.custom_substats || '{}'); } catch {}
                document.querySelectorAll('.char-sub-stat').forEach(i => i.value = subs[i.dataset.stat] || "");
                window.currentCustomDrops = [];
                try { window.currentCustomDrops = JSON.parse(item.custom_drops || '[]'); } catch {}
                if (typeof renderCustomDrops === 'function') renderCustomDrops();
            } else {
                let eq = {};
                try { eq = JSON.parse(item.equipment_data || '{}'); } catch {}
                (window.EQUIP_SLOTS || []).forEach(s => {
                    const sel = document.getElementById(`sel-${s}`);
                    if (sel) sel.value = eq[s] || "";
                });
            }
            let atks = [1];
            try { atks = JSON.parse(item.attacks || '[1]'); } catch {}
            document.querySelectorAll('.ch-atk-cb').forEach(cb => cb.checked = atks.includes(parseInt(cb.value)));
            if (typeof toggleRaceFields === 'function') toggleRaceFields();
            if (typeof updateLivePreview === 'function') updateLivePreview();
        }
    }, 150);
};

async function deleteItem(table, id) {
    if (confirm("Deseja apagar este item permanentemente?")) {
        await window.pywebview.api.delete_entity(table, id);
        await window.refreshData();
        if (typeof renderCrudTable === 'function') renderCrudTable();
        // Atualiza lista da forja se necessária
        if (table === 'bodies'          && typeof renderForgeBodyList  === 'function') renderForgeBodyList();
        if (table === 'equipments'      && typeof renderForgeEquipList === 'function') renderForgeEquipList();
        if (table === 'consumables'     && typeof renderForgeConsList  === 'function') renderForgeConsList();
        if (table === 'attacks'         && typeof renderForgeAtkList   === 'function') renderForgeAtkList();
        if (table === 'equipment_sets'  && typeof renderForgeSetsPanel === 'function') renderForgeSetsPanel();
    }
}
