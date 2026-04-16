// web/js/admin.js

function clearInputs(formId) {
    const el = document.getElementById(formId);
    if (!el) return;
    el.querySelectorAll('input').forEach(i => {
        if (i.type !== 'hidden' && i.type !== 'checkbox') i.value = '';
    });
    el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    el.querySelectorAll('.mini-preview').forEach(img => img.src = '');
}

async function saveBody() {
    const playable = document.getElementById('bd-playable');
    const data = {
        name: document.getElementById('bd-name').value,
        img_front: document.getElementById('bd-img-f').value,
        img_back: document.getElementById('bd-img-b').value,
        is_playable: (playable && playable.checked) ? 1 : 0
    };

    if (!data.name) return alert("Nome obrigatório");

    await window.pywebview.api.add_entity('bodies', data);
    alert("Corpo Salvo!");

    // Limpa campos
    document.getElementById('bd-name').value = '';
    document.getElementById('bd-img-f').value = '';
    document.getElementById('bd-img-b').value = '';
    if (playable) playable.checked = false;

    window.refreshData();
}

window.renderForgeStats = function() {
    const grid = document.getElementById('forge-stats-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Junta os atributos Base e Derivados
    const allStats = {...window.STAT_MAP.base, ...window.STAT_MAP.derived};
    
    for(let k in allStats) {
        grid.innerHTML += `<label style="display:flex; justify-content:space-between; margin-bottom:5px;">
            ${allStats[k]} 
            <input type="number" class="stat-mod-input" data-stat="${k}" value="0" style="width:60px; padding:2px;">
        </label>`;
    }
};

async function saveEquipment() {
    let mods = {};
    document.querySelectorAll('.stat-mod-input').forEach(i => {
        if(i.value && i.value != "0") mods[i.dataset.stat] = parseFloat(i.value);
    });

    let data = {
        name: document.getElementById('eq-name').value, 
        type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, 
        img_back: document.getElementById('eq-img-b').value,
        drop_chance: parseInt(document.getElementById('eq-drop').value) || 5,
        stats_modifiers: JSON.stringify(mods)
    };

    if(!data.name) { alert("Nome obrigatório!"); return; }

    await window.pywebview.api.add_entity('equipments', data);
    alert("Equipamento Salvo!"); 
    clearInputs('form-equip'); 
    window.renderForgeStats(); // Reseta os zeros
    await window.refreshData();
}

async function saveConsumable() {
    let data = {
        name: document.getElementById('cons-name').value,
        effect_type: document.getElementById('cons-type').value,
        effect_value: parseInt(document.getElementById('cons-value').value) || 0,
        img_path: document.getElementById('cons-img').value,
        drop_chance: parseInt(document.getElementById('cons-drop').value) || 20
    };

    if (!data.name) { alert("Preencha o nome do consumível!"); return; }

    await window.pywebview.api.add_entity('consumables', data);
    document.getElementById('admin-msg').innerText = "Consumível Salvo com Sucesso!";
    clearInputs('form-consumable');
    await window.refreshData();
}

async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = window.gameData[table] || [];
    const thead = document.getElementById('crud-thead');
    const tbody = document.getElementById('crud-tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

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
            if (val.length > 20) val = val.substring(0, 20) + '...';
            tr += `<td>${val}</td>`;
        });
        tr += `<td><button class="btn-del" onclick="deleteItem('${table}', ${row.id})">Deletar</button></td></tr>`;
        tbody.innerHTML += tr;
    });
}

async function deleteItem(table, id) {
    if (confirm("Deseja realmente apagar este item permanentemente?")) {
        await window.pywebview.api.delete_entity(table, id);
        await window.refreshData();
        renderCrudTable();
    }
}