function clearInputs(formId) {
    const el = document.getElementById(formId);
    el.querySelectorAll('input').forEach(i => { if(i.type !== 'hidden') i.value = ''; });
    el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    el.querySelectorAll('.mini-preview').forEach(img => img.src = '');
}

async function saveBody() {
    let data = { name: document.getElementById('bd-name').value, img_front: document.getElementById('bd-img-f').value, img_back: document.getElementById('bd-img-b').value };
    await window.pywebview.api.add_entity('bodies', data);
    document.getElementById('admin-msg').innerText = "Corpo Salvo com Sucesso!"; 
    clearInputs('form-body'); 
    await refreshData();
}

async function saveEquipment() {
    let data = {
        name: document.getElementById('eq-name').value, type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, img_back: document.getElementById('eq-img-b').value,
        def_phys: parseInt(document.getElementById('eq-pdef').value) || 0, def_mag: parseInt(document.getElementById('eq-mdef').value) || 0,
        bonus_str: parseInt(document.getElementById('eq-str').value) || 0, drop_chance: parseInt(document.getElementById('eq-drop').value) || 5
    };
    await window.pywebview.api.add_entity('equipments', data);
    document.getElementById('admin-msg').innerText = "Equipamento Salvo com Sucesso!"; 
    clearInputs('form-equip'); 
    await refreshData();
}

async function saveConsumable() {
    let data = {
        name: document.getElementById('cons-name').value, effect_type: document.getElementById('cons-type').value,
        effect_value: parseInt(document.getElementById('cons-value').value) || 0,
        img_path: document.getElementById('cons-img').value, 
        drop_chance: parseInt(document.getElementById('cons-drop').value) || 20
    };
    await window.pywebview.api.add_entity('consumables', data);
    document.getElementById('admin-msg').innerText = "Consumível Salvo com Sucesso!"; 
    clearInputs('form-consumable'); 
    await refreshData();
}

async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = window.gameData[table] ||[];
    const thead = document.getElementById('crud-thead'); const tbody = document.getElementById('crud-tbody');
    thead.innerHTML = ''; tbody.innerHTML = '';
    if (data.length === 0) return;
    
    const keys = Object.keys(data[0]);
    keys.forEach(k => thead.innerHTML += `<th>${k}</th>`);
    thead.innerHTML += `<th>Ação</th>`;
    
    data.forEach(row => {
        let tr = '<tr>';
        keys.forEach(k => tr += `<td>${String(row[k]).substring(0, 20)}</td>`);
        tr += `<td><button class="btn-del" onclick="deleteItem('${table}', ${row.id})">Deletar</button></td></tr>`;
        tbody.innerHTML += tr;
    });
}

async function deleteItem(table, id) {
    if(confirm("Deseja realmente apagar este item?")) { 
        await window.pywebview.api.delete_entity(table, id); 
        await refreshData(); 
        renderCrudTable(); 
    }
}