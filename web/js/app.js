let gameData = {};
let currentEnemy = null;
let currentEnemyHP = 0;
let isShowingBack = false;

const eqTypes =['pants', 'boots', 'shirt', 'gloves', 'face', 'hair', 'helmet'];

window.addEventListener('pywebviewready', async function() {
    await refreshGameData();
});

// ================= UTILIDADES (UI e Funcionalidades Novas) =================

// 1. Mostrar aba e pintar o botão selecionado de laranja
function showTab(tabId, btnElement) {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Tira 'active' de todos os botões do cabeçalho
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    
    // Adiciona 'active' ao botão clicado (ou encontra ele se foi via Javascript)
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const matchedBtn = document.querySelector(`.tabs button[onclick*="${tabId}"]`);
        if (matchedBtn) matchedBtn.classList.add('active');
    }

    if (tabId === 'game-tab') refreshGameData();
    if (tabId === 'crud-tab') renderCrudTable();
    if (tabId === 'char-tab') {
        document.getElementById('edit-char-id').value = '';
        document.getElementById('char-form-title').innerText = 'Montagem de Personagem';
    }
}

// 2. Chamar o Seletor de Arquivos do Windows via Python
async function pickFile(inputId, prevId) {
    const filePath = await window.pywebview.api.pick_image();
    if (filePath) {
        document.getElementById(inputId).value = filePath;
        updateMiniPrev(inputId, prevId); // Atualiza a fotinha
    }
}

// 3. Atualizar a Fotinha Pequena se o usuário digitar ou buscar
function updateMiniPrev(inputId, prevId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(prevId).src = val || "";
}

// 4. Limpar inputs de uma div específica
function clearFormInputs(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('input').forEach(inp => {
        if (inp.type === 'number') inp.value = '0';
        else if (inp.type === 'hidden') inp.value = '';
        else inp.value = '';
    });
    form.querySelectorAll('select').forEach(sel => sel.selectedIndex = 0);
    form.querySelectorAll('.mini-preview').forEach(img => img.src = '');
}


// ================= FORJA (CRIAR E SALVAR) =================
async function saveScenario() {
    const editId = document.getElementById('edit-sc-id').value;
    let data = { name: document.getElementById('sc-name').value, image_path: document.getElementById('sc-img').value, description: document.getElementById('sc-desc').value };
    
    if(editId) await window.pywebview.api.update_entity('scenarios', editId, data);
    else await window.pywebview.api.add_entity('scenarios', data);
    
    document.getElementById('admin-msg').innerText = "Cenário Salvo!";
    clearFormInputs('form-scenario');
    await refreshGameData();
}

async function saveBody() {
    const editId = document.getElementById('edit-bd-id').value;
    let data = { name: document.getElementById('bd-name').value, img_front: document.getElementById('bd-img-f').value, img_back: document.getElementById('bd-img-b').value };
    
    if(editId) await window.pywebview.api.update_entity('bodies', editId, data);
    else await window.pywebview.api.add_entity('bodies', data);
    
    document.getElementById('admin-msg').innerText = "Corpo Salvo!";
    clearFormInputs('form-body');
    await refreshGameData();
}

async function saveEquipment() {
    const editId = document.getElementById('edit-eq-id').value;
    let data = {
        name: document.getElementById('eq-name').value, type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, img_back: document.getElementById('eq-img-b').value,
        def_phys: parseInt(document.getElementById('eq-pdef').value) || 0, def_mag: parseInt(document.getElementById('eq-mdef').value) || 0,
        bonus_str: parseInt(document.getElementById('eq-str').value) || 0, bonus_int: parseInt(document.getElementById('eq-int').value) || 0, bonus_dex: parseInt(document.getElementById('eq-dex').value) || 0
    };
    
    if(editId) await window.pywebview.api.update_entity('equipments', editId, data);
    else await window.pywebview.api.add_entity('equipments', data);
    
    document.getElementById('admin-msg').innerText = "Equipamento Salvo!";
    clearFormInputs('form-equip');
    await refreshGameData();
}

async function saveCharacter() {
    const editId = document.getElementById('edit-char-id').value;
    const race = document.getElementById('ch-race').value;
    
    let data = {
        name: document.getElementById('ch-name').value,
        hp: parseInt(document.getElementById('ch-hp').value), attack: parseInt(document.getElementById('ch-atk').value), race: race
    };

    if (race === 'humano') {
        const equipMap = { base: document.getElementById('sel-base').value };
        eqTypes.forEach(t => { equipMap[t] = document.getElementById(`sel-${t}`).value; });
        data.equipment_data = equipMap; 
        data.img_front = ""; data.img_back = "";
    } else {
        data.img_front = document.getElementById('ch-img-f').value;
        data.img_back = document.getElementById('ch-img-b').value;
        data.equipment_data = "{}";
    }

    let response;
    if (editId) response = await window.pywebview.api.update_entity('characters', editId, data);
    else response = await window.pywebview.api.add_entity('characters', data);

    document.getElementById('char-msg').innerText = response.message;
    clearFormInputs('form-char');
    document.getElementById('ch-hp').value = 100; // default
    document.getElementById('ch-atk').value = 10;
    document.getElementById('prev-front').innerHTML = ''; document.getElementById('prev-back').innerHTML = '';
    await refreshGameData();
}


// ================= GERENCIADOR (CRUD E EDIT) =================
async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = gameData[table] ||[];
    const thead = document.getElementById('crud-thead');
    const tbody = document.getElementById('crud-tbody');
    thead.innerHTML = ''; tbody.innerHTML = '';

    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="100%">Vazio.</td></tr>'; return; }

    const keys = Object.keys(data[0]);
    keys.forEach(key => { thead.innerHTML += `<th>${key}</th>`; });
    thead.innerHTML += `<th>Ações</th>`;

    data.forEach(row => {
        let tr = `<tr>`;
        keys.forEach(key => {
            let val = row[key];
            if (val && val.length > 25) val = val.substring(0, 25) + '...';
            tr += `<td>${val}</td>`;
        });
        tr += `<td>
            <button class="btn-edit" onclick="editItem('${table}', ${row.id})">Editar</button>
            <button class="btn-del" onclick="deleteItem('${table}', ${row.id})">X</button>
        </td></tr>`;
        tbody.innerHTML += tr;
    });
}

function editItem(table, id) {
    const item = gameData[table].find(i => i.id == id);
    if(!item) return;

    if (table === 'bodies') {
        showTab('admin-tab');
        document.getElementById('edit-bd-id').value = id;
        document.getElementById('bd-name').value = item.name;
        document.getElementById('bd-img-f').value = item.img_front;
        document.getElementById('bd-img-b').value = item.img_back;
        updateMiniPrev('bd-img-f', 'prev-bd-f'); updateMiniPrev('bd-img-b', 'prev-bd-b');
        window.scrollTo(0,0);
    } else if (table === 'equipments') {
        showTab('admin-tab');
        document.getElementById('edit-eq-id').value = id;
        document.getElementById('eq-name').value = item.name;
        document.getElementById('eq-type').value = item.type;
        document.getElementById('eq-img-f').value = item.img_front;
        document.getElementById('eq-img-b').value = item.img_back;
        document.getElementById('eq-pdef').value = item.def_phys;
        document.getElementById('eq-mdef').value = item.def_mag;
        document.getElementById('eq-str').value = item.bonus_str;
        document.getElementById('eq-int').value = item.bonus_int;
        document.getElementById('eq-dex').value = item.bonus_dex;
        updateMiniPrev('eq-img-f', 'prev-eq-f'); updateMiniPrev('eq-img-b', 'prev-eq-b');
        window.scrollTo(0,0);
    } else if (table === 'scenarios') {
        showTab('admin-tab');
        document.getElementById('edit-sc-id').value = id;
        document.getElementById('sc-name').value = item.name;
        document.getElementById('sc-img').value = item.image_path;
        document.getElementById('sc-desc').value = item.description;
        updateMiniPrev('sc-img', 'prev-sc');
        window.scrollTo(0, document.body.scrollHeight);
    } else if (table === 'characters') {
        showTab('char-tab');
        document.getElementById('edit-char-id').value = id;
        document.getElementById('char-form-title').innerText = `Editando ID: ${id}`;
        document.getElementById('ch-name').value = item.name;
        document.getElementById('ch-hp').value = item.hp;
        document.getElementById('ch-atk').value = item.attack;
        document.getElementById('ch-race').value = item.race;
        toggleRaceFields();
        
        if (item.race === 'humano') {
            const eqData = JSON.parse(item.equipment_data);
            document.getElementById('sel-base').value = eqData.base || "";
            eqTypes.forEach(t => { document.getElementById(`sel-${t}`).value = eqData[t] || ""; });
            updatePrev();
        } else {
            document.getElementById('ch-img-f').value = item.img_front;
            document.getElementById('ch-img-b').value = item.img_back;
            updateMiniPrev('ch-img-f', 'prev-ch-f'); updateMiniPrev('ch-img-b', 'prev-ch-b');
        }
    }
}

async function deleteItem(table, id) {
    if(confirm("Apagar item do banco de dados?")) {
        await window.pywebview.api.delete_entity(table, id);
        await refreshGameData();
        renderCrudTable();
    }
}

// ================= MONTAR PERSONAGEM (LOGICA) =================
function toggleRaceFields() {
    const race = document.getElementById('ch-race').value;
    if (race === 'humano') {
        document.getElementById('simple-fields').style.display = 'none';
        document.getElementById('human-fields').style.display = 'block';
        document.getElementById('preview-panel').style.display = 'block';
    } else {
        document.getElementById('simple-fields').style.display = 'block';
        document.getElementById('human-fields').style.display = 'none';
        document.getElementById('preview-panel').style.display = 'none';
    }
}

function populateEquipSelects() {
    const selBase = document.getElementById('sel-base');
    selBase.innerHTML = '<option value="">-- Escolha um Corpo --</option>';
    gameData.bodies.forEach(b => { selBase.innerHTML += `<option value="${b.id}">${b.name}</option>`; });

    eqTypes.forEach(type => {
        const sel = document.getElementById(`sel-${type}`);
        if(sel) {
            sel.innerHTML = `<option value="">-- Vazio --</option>`;
            const items = gameData.equipments.filter(e => e.type === type);
            items.forEach(item => {
                let statsTxt = `(PDef:${item.def_phys} MDef:${item.def_mag} For:${item.bonus_str})`;
                sel.innerHTML += `<option value="${item.id}">${item.name} ${statsTxt}</option>`;
            });
        }
    });
}

function updatePrev() {
    const containerF = document.getElementById('prev-front'); const containerB = document.getElementById('prev-back');
    containerF.innerHTML = ''; containerB.innerHTML = '';
    let totalStats = { pdef: 0, mdef: 0, str: 0, int: 0, dex: 0 };

    const baseId = document.getElementById('sel-base').value;
    if (baseId) {
        const bodyData = gameData.bodies.find(b => b.id == baseId);
        if (bodyData) {
            if(bodyData.img_front) containerF.innerHTML += `<img src="${bodyData.img_front}" style="z-index: 0;">`;
            if(bodyData.img_back) containerB.innerHTML += `<img src="${bodyData.img_back}" style="z-index: 0;">`;
        }
    }

    eqTypes.forEach((type, index) => {
        const eqId = document.getElementById(`sel-${type}`).value;
        if (eqId) {
            const eqData = gameData.equipments.find(e => e.id == eqId);
            if (eqData) {
                if(eqData.img_front) containerF.innerHTML += `<img src="${eqData.img_front}" style="z-index: ${index + 1};">`;
                if(eqData.img_back) containerB.innerHTML += `<img src="${eqData.img_back}" style="z-index: ${index + 1};">`;
                totalStats.pdef += eqData.def_phys; totalStats.mdef += eqData.def_mag;
                totalStats.str += eqData.bonus_str; totalStats.int += eqData.bonus_int; totalStats.dex += eqData.bonus_dex;
            }
        }
    });

    document.getElementById('st-pdef').innerText = totalStats.pdef; document.getElementById('st-mdef').innerText = totalStats.mdef;
    document.getElementById('st-str').innerText = totalStats.str; document.getElementById('st-int').innerText = totalStats.int;
    document.getElementById('st-dex').innerText = totalStats.dex;
}


// ================= JOGO (VISUAL NOVEL) =================
async function refreshGameData() {
    gameData = await window.pywebview.api.load_data();
    populateEquipSelects();

    const scSelect = document.getElementById('select-scenario');
    scSelect.innerHTML = '<option value="">-- Mudar Cenário --</option>';
    gameData.scenarios.forEach(sc => { scSelect.innerHTML += `<option value="${sc.id}">${sc.name}</option>`; });

    const enSelect = document.getElementById('select-enemy');
    enSelect.innerHTML = '<option value="">-- Invocar Inimigo --</option>';
    gameData.characters.forEach(ch => { enSelect.innerHTML += `<option value="${ch.id}">${ch.name} (HP: ${ch.hp})</option>`; });
}

function changeScenario() {
    const scId = document.getElementById('select-scenario').value;
    if (!scId) return;
    const scenario = gameData.scenarios.find(s => s.id == scId);
    document.getElementById('game-screen').style.backgroundImage = `url('${scenario.image_path}')`;
    document.getElementById('dialogue-text').innerText = scenario.description;
}

function spawnEnemy() {
    const enId = document.getElementById('select-enemy').value;
    if (!enId) return;
    
    currentEnemy = gameData.characters.find(c => c.id == enId);
    currentEnemyHP = currentEnemy.hp;
    isShowingBack = false;
    
    document.getElementById('enemy-name').innerText = currentEnemy.name;
    document.getElementById('attack-btn').disabled = false;
    document.getElementById('turn-btn').disabled = false;
    
    renderInGameCharacter(); updateHPBar();
    document.getElementById('dialogue-text').innerText = `${currentEnemy.name} apareceu!`;
}

function renderInGameCharacter() {
    const imgEl = document.getElementById('enemy-image');
    const layerContainer = document.getElementById('in-game-layers');
    const side = isShowingBack ? 'b' : 'f';

    if (currentEnemy.race === 'humano') {
        imgEl.style.display = 'none'; layerContainer.style.display = 'block';
        layerContainer.innerHTML = '';
        const eqDataMap = JSON.parse(currentEnemy.equipment_data);
        
        if (eqDataMap.base) {
            const body = gameData.bodies.find(b => b.id == eqDataMap.base);
            const bodyImg = side === 'f' ? body?.img_front : body?.img_back;
            if(bodyImg) layerContainer.innerHTML += `<img src="${bodyImg}" style="z-index: 0;">`;
        }

        eqTypes.forEach((type, index) => {
            const eqId = eqDataMap[type];
            if (eqId) {
                const eq = gameData.equipments.find(e => e.id == eqId);
                const eqImg = side === 'f' ? eq?.img_front : eq?.img_back;
                if(eqImg) layerContainer.innerHTML += `<img src="${eqImg}" style="z-index: ${index + 1};">`;
            }
        });
    } else {
        layerContainer.style.display = 'none'; imgEl.style.display = 'block';
        imgEl.src = side === 'f' ? currentEnemy.img_front : currentEnemy.img_back;
    }
}

function turnCharacter() {
    if(!currentEnemy) return;
    isShowingBack = !isShowingBack;
    renderInGameCharacter();
}

async function performAttack() {
    if (!currentEnemy || currentEnemyHP <= 0) return;
    const elToAnimate = currentEnemy.race === 'humano' ? document.getElementById('in-game-layers') : document.getElementById('enemy-image');
    elToAnimate.classList.add('hit');
    setTimeout(() => elToAnimate.classList.remove('hit'), 150);

    const result = await window.pywebview.api.attack_enemy(currentEnemy.hp, currentEnemyHP);
    currentEnemyHP = result.new_hp;
    updateHPBar();
    document.getElementById('dialogue-text').innerText = result.message;

    if (result.status === 'dead') {
        document.getElementById('attack-btn').disabled = true; document.getElementById('turn-btn').disabled = true;
        setTimeout(() => elToAnimate.style.display = 'none', 1000);
    }
}

function updateHPBar() {
    if (!currentEnemy) return;
    document.getElementById('enemy-hp-text').innerText = `HP: ${currentEnemyHP}/${currentEnemy.hp}`;
    const percent = Math.max(0, (currentEnemyHP / currentEnemy.hp) * 100);
    document.getElementById('enemy-hp-fill').style.width = `${percent}%`;
}