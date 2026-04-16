// web/js/admin.js

function clearInputs(formId) {
    const el = document.getElementById(formId);
    if(!el) return;
    el.querySelectorAll('input').forEach(i => { 
        if(i.type !== 'hidden' && i.type !== 'checkbox') i.value = ''; 
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
    if(playable) playable.checked = false;
    
    window.refreshData();
}

async function saveEquipment() {
    let data = {
        name: document.getElementById('eq-name').value, 
        type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, 
        img_back: document.getElementById('eq-img-b').value,
        def_phys: parseInt(document.getElementById('eq-pdef').value) || 0, 
        def_mag: parseInt(document.getElementById('eq-mdef').value) || 0,
        bonus_str: parseInt(document.getElementById('eq-str').value) || 0, 
        drop_chance: parseInt(document.getElementById('eq-drop').value) || 5
    };

    if(!data.name) { alert("Preencha o nome do equipamento!"); return; }

    await window.pywebview.api.add_entity('equipments', data);
    document.getElementById('admin-msg').innerText = "Equipamento Salvo com Sucesso!"; 
    clearInputs('form-equip'); 
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

    if(!data.name) { alert("Preencha o nome do consumível!"); return; }

    await window.pywebview.api.add_entity('consumables', data);
    document.getElementById('admin-msg').innerText = "Consumível Salvo com Sucesso!"; 
    clearInputs('form-consumable'); 
    await window.refreshData();
}

async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = window.gameData[table] ||[];
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
            if(val.length > 20) val = val.substring(0, 20) + '...';
            tr += `<td>${val}</td>`;
        });
        tr += `<td><button class="btn-del" onclick="deleteItem('${table}', ${row.id})">Deletar</button></td></tr>`;
        tbody.innerHTML += tr;
    });
}

async function deleteItem(table, id) {
    if(confirm("Deseja realmente apagar este item permanentemente?")) { 
        await window.pywebview.api.delete_entity(table, id); 
        await window.refreshData(); 
        renderCrudTable(); 
    }
}