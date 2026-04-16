// frontend/src/js/admin.js
function clearInputs(formId) {
    const el = document.getElementById(formId);
    if(!el) return;
    el.querySelectorAll('input').forEach(i => { 
        if(i.type !== 'checkbox') i.value = ''; 
    });
    el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    el.querySelectorAll('textarea').forEach(t => t.value = ''); // Limpa textarea
    el.querySelectorAll('.mini-preview').forEach(img => img.src = '');
}

async function saveBody() {
    const playableCheckbox = document.getElementById('bd-playable');
    const editId = document.getElementById('edit-bd-id').value;

    let data = { 
        name: document.getElementById('bd-name').value, 
        img_front: document.getElementById('bd-img-f').value, 
        img_back: document.getElementById('bd-img-b').value,
        is_playable: (playableCheckbox && playableCheckbox.checked) ? 1 : 0
    };

    if(!data.name) return window.showToast("Preencha o nome do corpo!", "error");
    if (editId) await window.pywebview.api.update_entity('bodies', editId, data);
    else await window.pywebview.api.add_entity('bodies', data);
    
    window.showToast("Corpo Salvo com sucesso!", "success");
    clearInputs('form-body'); 
    if(playableCheckbox) playableCheckbox.checked = false;
    await window.refreshData();
}

async function saveEquipment() {
    let mods = {};
    document.querySelectorAll('.stat-mod-input').forEach(i => {
        if(i.value && i.value != "0") mods[i.dataset.stat] = parseFloat(i.value);
    });

    const editId = document.getElementById('edit-eq-id').value;
    let data = {
        name: document.getElementById('eq-name').value, 
        type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, 
        img_back: document.getElementById('eq-img-b').value,
        drop_chance: parseInt(document.getElementById('eq-drop').value) || 5,
        stats_modifiers: JSON.stringify(mods)
    };

    if(!data.name) return window.showToast("Nome obrigatório!", "error");
    if (editId) await window.pywebview.api.update_entity('equipments', editId, data);
    else await window.pywebview.api.add_entity('equipments', data);

    window.showToast("Equipamento Forjado com sucesso!", "success");
    clearInputs('form-equip'); 
    window.renderForgeStats(); 
    await window.refreshData();
}

async function saveConsumable() {
    const editId = document.getElementById('edit-cons-id').value;
    let data = {
        name: document.getElementById('cons-name').value, 
        effect_type: document.getElementById('cons-type').value,
        effect_value: parseInt(document.getElementById('cons-value').value) || 0,
        img_path: document.getElementById('cons-img').value, 
        drop_chance: parseInt(document.getElementById('cons-drop').value) || 20
    };

    if(!data.name) return window.showToast("Nome obrigatório!", "error");
    if (editId) await window.pywebview.api.update_entity('consumables', editId, data);
    else await window.pywebview.api.add_entity('consumables', data);

    window.showToast("Item Consumível Salvo!", "success");
    clearInputs('form-consumable'); 
    await window.refreshData();
}

async function saveAttack() {
    const editId = document.getElementById('edit-atk-id').value;
    let scaling = {};
    
    document.querySelectorAll('.atk-scale-input').forEach(i => {
        const val = parseFloat(i.value);
        if (val > 0) scaling[i.dataset.stat] = val;
    });

    let data = {
        name: document.getElementById('atk-name').value,
        atk_type: document.getElementById('atk-type').value,
        hp_cost: parseInt(document.getElementById('atk-hp-cost').value) || 0,
        mana_cost: parseInt(document.getElementById('atk-mana-cost').value) || 0,
        stamina_cost: parseInt(document.getElementById('atk-stamina-cost').value) || 0,
        description: document.getElementById('atk-description').value,
        base_power: parseFloat(document.getElementById('atk-base').value) || 0,
        scaling: JSON.stringify(scaling)
    };
    
    if(!data.name) return window.showToast("O Nome do Ataque é obrigatório!", "error");

    if (editId) await window.pywebview.api.update_entity('attacks', editId, data);
    else await window.pywebview.api.add_entity('attacks', data);

    window.showToast("Habilidade Registrada!", "success");
    clearInputs('form-attack');
    await window.refreshData();
}

async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = window.gameData[table] ||[];
    const thead = document.getElementById('crud-thead'); 
    const tbody = document.getElementById('crud-tbody');
    
    thead.innerHTML = ''; tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Nenhum dado encontrado.</td></tr>';
        return;
    }
    
    const keys = Object.keys(data[0]);
    keys.forEach(k => thead.innerHTML += `<th>${k}</th>`);
    thead.innerHTML += `<th>Ação</th>`;
    
    data.forEach(row => {
        let tr = '<tr>';
        keys.forEach(k => {
            let val = String(row[k]);
            if(val.length > 15) val = val.substring(0, 15) + '...';
            tr += `<td>${val}</td>`;
        });
        tr += `<td style="display:flex; gap:5px;">
                <button style="background:#f39c12; border:none; padding:5px; border-radius:3px; cursor:pointer; font-weight:bold;" onclick="editItem('${table}', ${row.id})">Editar</button>
                <button class="btn-del" onclick="deleteItem('${table}', ${row.id})">Deletar</button>
               </td></tr>`;
        tbody.innerHTML += tr;
    });
}

window.editItem = function(table, id) {
    const item = window.gameData[table].find(i => i.id == id);
    if (!item) return;

    if (table === 'bodies' || table === 'equipments' || table === 'consumables' || table === 'attacks') showTab('admin-tab');
    else if (table === 'characters') showTab('char-tab');

    setTimeout(() => {
        if (table === 'bodies') {
            document.getElementById('edit-bd-id').value = id;
            document.getElementById('bd-name').value = item.name;
            document.getElementById('bd-img-f').value = item.img_front;
            document.getElementById('bd-img-b').value = item.img_back;
            const playable = document.getElementById('bd-playable');
            if (playable) playable.checked = (item.is_playable == 1);
        } 
        else if (table === 'equipments') {
            document.getElementById('edit-eq-id').value = id;
            document.getElementById('eq-name').value = item.name;
            document.getElementById('eq-type').value = item.type;
            document.getElementById('eq-img-f').value = item.img_front;
            document.getElementById('eq-img-b').value = item.img_back;
            document.getElementById('eq-drop').value = item.drop_chance;
            
            let mods = JSON.parse(item.stats_modifiers || '{}');
            document.querySelectorAll('.stat-mod-input').forEach(i => i.value = mods[i.dataset.stat] || 0);
        }
        else if (table === 'consumables') {
            document.getElementById('edit-cons-id').value = id;
            document.getElementById('cons-name').value = item.name;
            document.getElementById('cons-type').value = item.effect_type;
            document.getElementById('cons-value').value = item.effect_value;
            document.getElementById('cons-img').value = item.img_path;
            document.getElementById('cons-drop').value = item.drop_chance;
        }
        else if (table === 'attacks') {
            document.getElementById('edit-atk-id').value = id;
            document.getElementById('atk-name').value = item.name;
            document.getElementById('atk-type').value = item.atk_type;
            document.getElementById('atk-hp-cost').value = item.hp_cost !== undefined ? item.hp_cost : 0;
            document.getElementById('atk-mana-cost').value = item.mana_cost !== undefined ? item.mana_cost : 0;
            document.getElementById('atk-stamina-cost').value = item.stamina_cost !== undefined ? item.stamina_cost : 5;
            document.getElementById('atk-description').value = item.description || '';
            document.getElementById('atk-base').value = item.base_power;
            
            let scaling = JSON.parse(item.scaling || '{}');
            document.querySelectorAll('.atk-scale-input').forEach(i => i.value = scaling[i.dataset.stat] || 0);
        }
        else if (table === 'characters') {
            document.getElementById('edit-char-id').value = id;
            document.getElementById('ch-name').value = item.name;
            document.getElementById('ch-race').value = item.race;
            
            let base = JSON.parse(item.base_stats || '{}');
            document.querySelectorAll('.char-base-stat').forEach(i => i.value = base[i.dataset.stat] || 1);

            if (item.race === 'monstro') {
                document.getElementById('ch-img-f').value = item.img_front;
                document.getElementById('ch-img-b').value = item.img_back;
                let subs = JSON.parse(item.custom_substats || '{}');
                document.querySelectorAll('.char-sub-stat').forEach(i => i.value = subs[i.dataset.stat] || "");
                window.currentCustomDrops = JSON.parse(item.custom_drops || '[]');
                renderCustomDrops();
            } else {
                let eq = JSON.parse(item.equipment_data || '{}');
                window.EQUIP_SLOTS.forEach(s => {
                    let sel = document.getElementById(`sel-${s}`);
                    if (sel) sel.value = eq[s] || "";
                });
            }
            
            let atks =[];
            try { atks = JSON.parse(item.attacks || '[1]'); } catch(e){}
            document.querySelectorAll('.ch-atk-cb').forEach(cb => cb.checked = atks.includes(parseInt(cb.value)));
            
            toggleRaceFields();
            updateLivePreview();
        }
    }, 100); 
};

window.renderForgeStats = function() {
    const grid = document.getElementById('forge-stats-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const allStats = {...window.STAT_MAP.base, ...window.STAT_MAP.derived};
    for(let k in allStats) {
        grid.innerHTML += `<label style="display:flex; justify-content:space-between; margin-bottom:5px;">
            ${allStats[k]} <input type="number" class="stat-mod-input" data-stat="${k}" value="0" style="width:60px; padding:2px;">
        </label>`;
    }
};

async function deleteItem(table, id) {
    if(confirm("Deseja realmente apagar este item permanentemente?")) { 
        await window.pywebview.api.delete_entity(table, id); 
        await window.refreshData(); 
    }
}