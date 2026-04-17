// frontend/src/js/admin/admin_manager.js

// ══════════════════════════════════════════════════
// SALVAR ITENS DA FORJA
// ══════════════════════════════════════════════════

window.saveBody = async function() {
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
    if (typeof window.clearForgeForm === 'function') window.clearForgeForm('body');
    await window.refreshData();
    if (typeof window.renderForgeBodyList === 'function') window.renderForgeBodyList();
};

window.saveEquipment = async function() {
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
    if (typeof window.clearForgeForm === 'function') window.clearForgeForm('equip');
    if (typeof window.renderForgeStats === 'function') window.renderForgeStats();
    await window.refreshData();
    if (typeof window.renderForgeEquipList === 'function') window.renderForgeEquipList();
};

window.saveConsumable = async function() {
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
    if (typeof window.clearForgeForm === 'function') window.clearForgeForm('cons');
    await window.refreshData();
    if (typeof window.renderForgeConsList === 'function') window.renderForgeConsList();
};

window.saveAttack = async function() {
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
    if (typeof window.clearForgeForm === 'function') window.clearForgeForm('atk');
    await window.refreshData();
    if (typeof window.renderForgeAtkList === 'function') window.renderForgeAtkList();
};

// ══════════════════════════════════════════════════
// EDIÇÃO A PARTIR DO BANCO DE DADOS
// ══════════════════════════════════════════════════

window.editItem = function(table, id) {
    const item = (window.gameData?.[table] ||[]).find(i => i.id == id);
    if (!item) return;

    // Mapeamento de tabelas para abas da Forja
    const forgeTabMap = {
        bodies: 'bodies', equipments: 'equipments',
        consumables: 'consumables', attacks: 'attacks',
        equipment_sets: 'sets',
    };

    // Navega para a aba correta
    if (forgeTabMap[table]) {
        window.showTab('admin-tab');
        setTimeout(() => {
            if (typeof window.switchForgeTab === 'function') {
                window.switchForgeTab(forgeTabMap[table], null);
            }
        }, 80);
    } else if (table === 'characters') {
        window.showTab('char-tab');
    }

    // Preenche os campos após a tela renderizar
    setTimeout(() => {
        
        if (table === 'characters') {
            // Delega a montagem visual para o builder.js
            if (typeof window.loadCharacterToBuilder === 'function') {
                window.loadCharacterToBuilder(item);
            } else {
                console.error("Erro: window.loadCharacterToBuilder não encontrado.");
            }
        }
        else if (table === 'bodies') {
            document.getElementById('edit-bd-id').value    = id;
            document.getElementById('bd-name').value       = item.name;
            document.getElementById('bd-img-f').value      = item.img_front    || '';
            document.getElementById('bd-img-b').value      = item.img_back     || '';
            const ffEl = document.getElementById('bd-img-f-f'); if(ffEl) ffEl.value = item.img_front_f || '';
            const bfEl = document.getElementById('bd-img-b-f'); if(bfEl) bfEl.value = item.img_back_f  || '';
            const ck   = document.getElementById('bd-playable'); if(ck) ck.checked = (item.is_playable == 1);['bd-img-f','bd-img-b','bd-img-f-f','bd-img-b-f'].forEach((inputId, i) => {
                const prevIds =['prev-bd-f','prev-bd-b','prev-bd-ff','prev-bd-bf'];
                if (typeof window.updateMiniPrev === 'function') {
                    window.updateMiniPrev(inputId, prevIds[i]);
                }
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
            if (typeof window.editSetItem === 'function') window.editSetItem(id);
        }
    }, 150);
};