// web/js/admin.js

function clearInputs(formId) {
    const el = document.getElementById(formId);
    if(!el) return;
    el.querySelectorAll('input').forEach(i => { 
        if(i.type !== 'checkbox') i.value = ''; // Limpa os text, number e hidden
    });
    el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
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

    if(!data.name) return alert("Preencha o nome do corpo!");

    if (editId) {
        await window.pywebview.api.update_entity('bodies', editId, data);
        document.getElementById('admin-msg').innerText = "Corpo Atualizado!";
    } else {
        await window.pywebview.api.add_entity('bodies', data);
        document.getElementById('admin-msg').innerText = "Corpo Salvo!"; 
    }

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

    if(!data.name) return alert("Nome obrigatório!");

    if (editId) {
        await window.pywebview.api.update_entity('equipments', editId, data);
        alert("Equipamento Atualizado!");
    } else {
        await window.pywebview.api.add_entity('equipments', data);
        alert("Equipamento Salvo!"); 
    }

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

    if(!data.name) return alert("Nome obrigatório!");

    if (editId) {
        await window.pywebview.api.update_entity('consumables', editId, data);
        document.getElementById('admin-msg').innerText = "Consumível Atualizado!"; 
    } else {
        await window.pywebview.api.add_entity('consumables', data);
        document.getElementById('admin-msg').innerText = "Consumível Salvo!"; 
    }

    clearInputs('form-consumable'); 
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

// NOVO: Função Global para Puxar os dados e preencher os formulários!
window.editItem = function(table, id) {
    const item = window.gameData[table].find(i => i.id == id);
    if (!item) return;

    // Primeiro, mudamos para a aba correta
    if (table === 'bodies' || table === 'equipments' || table === 'consumables') {
        showTab('admin-tab');
    } else if (table === 'characters') {
        showTab('char-tab');
    }

    // Agora, usamos um pequeno atraso (setTimeout) para garantir que 
    // o showTab terminou de rodar e não vai resetar nossos campos.
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
            document.querySelectorAll('.stat-mod-input').forEach(i => {
                i.value = mods[i.dataset.stat] || 0;
            });
        }
        else if (table === 'characters') {
            document.getElementById('edit-char-id').value = id;
            document.getElementById('ch-name').value = item.name;
            document.getElementById('ch-race').value = item.race;
            
            let base = JSON.parse(item.base_stats || '{}');
            document.querySelectorAll('.char-base-stat').forEach(i => {
                i.value = base[i.dataset.stat] || 1;
            });

            if (item.race === 'monstro') {
                document.getElementById('ch-img-f').value = item.img_front;
                document.getElementById('ch-img-b').value = item.img_back;
                let subs = JSON.parse(item.custom_substats || '{}');
                document.querySelectorAll('.char-sub-stat').forEach(i => {
                    i.value = subs[i.dataset.stat] || "";
                });
                window.currentCustomDrops = JSON.parse(item.custom_drops || '[]');
                renderCustomDrops();
            } else {
                let eq = JSON.parse(item.equipment_data || '{}');
                window.EQUIP_SLOTS.forEach(s => {
                    let sel = document.getElementById(`sel-${s}`);
                    if (sel) sel.value = eq[s] || "";
                });
            }
            toggleRaceFields();
            updateLivePreview();
        }
    }, 100); // 100 milissegundos é o suficiente para evitar o conflito
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