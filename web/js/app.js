let gameData = {};
let currentPlayer = null;
let currentEnemy = null;
let playerHP = 0;
let enemyHP = 0;
let isTurnBusy = false;

const eqTypes =['pants', 'boots', 'shirt', 'gloves', 'face', 'hair', 'helmet'];

window.addEventListener('pywebviewready', async function() {
    await refreshGameData();
});

function showTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    if (tabId === 'game-tab') refreshGameData();
    if (tabId === 'crud-tab') renderCrudTable();
    if (tabId === 'char-tab') {
        document.getElementById('edit-char-id').value = '';
        document.getElementById('char-form-title').innerText = 'Montagem de Personagem';
    }
}

function updateMiniPrev(inputId, prevId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(prevId).src = val || "";
}

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
    if(editId) await window.pywebview.api.update_entity('scenarios', editId, data); else await window.pywebview.api.add_entity('scenarios', data);
    document.getElementById('admin-msg').innerText = "Cenário Salvo!"; clearFormInputs('form-scenario'); await refreshGameData();
}

async function saveBody() {
    const editId = document.getElementById('edit-bd-id').value;
    let data = { name: document.getElementById('bd-name').value, img_front: document.getElementById('bd-img-f').value, img_back: document.getElementById('bd-img-b').value };
    if(editId) await window.pywebview.api.update_entity('bodies', editId, data); else await window.pywebview.api.add_entity('bodies', data);
    document.getElementById('admin-msg').innerText = "Corpo Salvo!"; clearFormInputs('form-body'); await refreshGameData();
}

async function saveEquipment() {
    const editId = document.getElementById('edit-eq-id').value;
    let data = {
        name: document.getElementById('eq-name').value, type: document.getElementById('eq-type').value,
        img_front: document.getElementById('eq-img-f').value, img_back: document.getElementById('eq-img-b').value,
        def_phys: parseInt(document.getElementById('eq-pdef').value) || 0, def_mag: parseInt(document.getElementById('eq-mdef').value) || 0,
        bonus_str: parseInt(document.getElementById('eq-str').value) || 0, bonus_int: parseInt(document.getElementById('eq-int').value) || 0, bonus_dex: parseInt(document.getElementById('eq-dex').value) || 0
    };
    if(editId) await window.pywebview.api.update_entity('equipments', editId, data); else await window.pywebview.api.add_entity('equipments', data);
    document.getElementById('admin-msg').innerText = "Equipamento Salvo!"; clearFormInputs('form-equip'); await refreshGameData();
}

async function saveCharacter() {
    const editId = document.getElementById('edit-char-id').value;
    const race = document.getElementById('ch-race').value;
    let data = { name: document.getElementById('ch-name').value, hp: parseInt(document.getElementById('ch-hp').value), attack: parseInt(document.getElementById('ch-atk').value), race: race };

    if (race === 'humano') {
        const equipMap = { base: document.getElementById('sel-base').value };
        eqTypes.forEach(t => { equipMap[t] = document.getElementById(`sel-${t}`).value; });
        data.equipment_data = equipMap; data.img_front = ""; data.img_back = "";
    } else {
        data.img_front = document.getElementById('ch-img-f').value; data.img_back = document.getElementById('ch-img-b').value; data.equipment_data = "{}";
    }

    let response;
    if (editId) response = await window.pywebview.api.update_entity('characters', editId, data); else response = await window.pywebview.api.add_entity('characters', data);
    document.getElementById('char-msg').innerText = response.message;
    clearFormInputs('form-char');
    document.getElementById('ch-hp').value = 100; document.getElementById('ch-atk').value = 10;
    document.getElementById('prev-front').innerHTML = ''; document.getElementById('prev-back').innerHTML = '';
    await refreshGameData();
}

// ================= GERENCIADOR (CRUD) =================
async function renderCrudTable() {
    const table = document.getElementById('crud-table-select').value;
    const data = gameData[table] ||[];
    const thead = document.getElementById('crud-thead'); const tbody = document.getElementById('crud-tbody');
    thead.innerHTML = ''; tbody.innerHTML = '';

    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="100%">Vazio.</td></tr>'; return; }
    const keys = Object.keys(data[0]);
    keys.forEach(key => { thead.innerHTML += `<th>${key}</th>`; });
    thead.innerHTML += `<th>Ações</th>`;

    data.forEach(row => {
        let tr = `<tr>`;
        keys.forEach(key => {
            let val = row[key]; if (val && val.length > 25) val = val.substring(0, 25) + '...';
            tr += `<td>${val}</td>`;
        });
        tr += `<td><button class="btn-edit" onclick="editItem('${table}', ${row.id})">Editar</button><button class="btn-del" onclick="deleteItem('${table}', ${row.id})">X</button></td></tr>`;
        tbody.innerHTML += tr;
    });
}

function editItem(table, id) {
    const item = gameData[table].find(i => i.id == id);
    if(!item) return;

    if (table === 'bodies') {
        showTab('admin-tab'); document.getElementById('edit-bd-id').value = id;
        document.getElementById('bd-name').value = item.name; document.getElementById('bd-img-f').value = item.img_front; document.getElementById('bd-img-b').value = item.img_back;
        updateMiniPrev('bd-img-f', 'prev-bd-f'); updateMiniPrev('bd-img-b', 'prev-bd-b'); window.scrollTo(0,0);
    } else if (table === 'equipments') {
        showTab('admin-tab'); document.getElementById('edit-eq-id').value = id;
        document.getElementById('eq-name').value = item.name; document.getElementById('eq-type').value = item.type;
        document.getElementById('eq-img-f').value = item.img_front; document.getElementById('eq-img-b').value = item.img_back;
        document.getElementById('eq-pdef').value = item.def_phys; document.getElementById('eq-mdef').value = item.def_mag; document.getElementById('eq-str').value = item.bonus_str; document.getElementById('eq-int').value = item.bonus_int; document.getElementById('eq-dex').value = item.bonus_dex;
        updateMiniPrev('eq-img-f', 'prev-eq-f'); updateMiniPrev('eq-img-b', 'prev-eq-b'); window.scrollTo(0,0);
    } else if (table === 'scenarios') {
        showTab('admin-tab'); document.getElementById('edit-sc-id').value = id;
        document.getElementById('sc-name').value = item.name; document.getElementById('sc-img').value = item.image_path; document.getElementById('sc-desc').value = item.description;
        updateMiniPrev('sc-img', 'prev-sc'); window.scrollTo(0, document.body.scrollHeight);
    } else if (table === 'characters') {
        showTab('char-tab'); document.getElementById('edit-char-id').value = id; document.getElementById('char-form-title').innerText = `Editando ID: ${id}`;
        document.getElementById('ch-name').value = item.name; document.getElementById('ch-hp').value = item.hp; document.getElementById('ch-atk').value = item.attack; document.getElementById('ch-race').value = item.race;
        toggleRaceFields();
        if (item.race === 'humano') {
            const eqData = JSON.parse(item.equipment_data);
            document.getElementById('sel-base').value = eqData.base || "";
            eqTypes.forEach(t => { document.getElementById(`sel-${t}`).value = eqData[t] || ""; });
            updatePrev();
        } else {
            document.getElementById('ch-img-f').value = item.img_front; document.getElementById('ch-img-b').value = item.img_back;
            updateMiniPrev('ch-img-f', 'prev-ch-f'); updateMiniPrev('ch-img-b', 'prev-ch-b');
        }
    }
}

async function deleteItem(table, id) {
    if(confirm("Apagar item do banco de dados?")) { await window.pywebview.api.delete_entity(table, id); await refreshGameData(); renderCrudTable(); }
}

// ================= MONTAR PERSONAGEM =================
function toggleRaceFields() {
    const race = document.getElementById('ch-race').value;
    document.getElementById('simple-fields').style.display = race === 'humano' ? 'none' : 'block';
    document.getElementById('human-fields').style.display = race === 'humano' ? 'block' : 'none';
    document.getElementById('preview-panel').style.display = race === 'humano' ? 'block' : 'none';
}

function populateEquipSelects() {
    const selBase = document.getElementById('sel-base'); selBase.innerHTML = '<option value="">-- Escolha um Corpo --</option>';
    gameData.bodies.forEach(b => { selBase.innerHTML += `<option value="${b.id}">${b.name}</option>`; });
    eqTypes.forEach(type => {
        const sel = document.getElementById(`sel-${type}`);
        if(sel) {
            sel.innerHTML = `<option value="">-- Vazio --</option>`;
            gameData.equipments.filter(e => e.type === type).forEach(item => {
                sel.innerHTML += `<option value="${item.id}">${item.name} (Def:${item.def_phys} For:${item.bonus_str})</option>`;
            });
        }
    });
}

function updatePrev() {
    const cF = document.getElementById('prev-front'); const cB = document.getElementById('prev-back');
    cF.innerHTML = ''; cB.innerHTML = ''; let stats = { pdef: 0, mdef: 0, str: 0, int: 0, dex: 0 };
    const baseId = document.getElementById('sel-base').value;
    if (baseId) {
        const bd = gameData.bodies.find(b => b.id == baseId);
        if(bd && bd.img_front) cF.innerHTML += `<img src="${bd.img_front}" style="z-index: 0;">`;
        if(bd && bd.img_back) cB.innerHTML += `<img src="${bd.img_back}" style="z-index: 0;">`;
    }
    eqTypes.forEach((type, index) => {
        const eqId = document.getElementById(`sel-${type}`).value;
        if (eqId) {
            const eq = gameData.equipments.find(e => e.id == eqId);
            if (eq) {
                if(eq.img_front) cF.innerHTML += `<img src="${eq.img_front}" style="z-index: ${index + 1};">`;
                if(eq.img_back) cB.innerHTML += `<img src="${eq.img_back}" style="z-index: ${index + 1};">`;
                stats.pdef += eq.def_phys; stats.mdef += eq.def_mag; stats.str += eq.bonus_str; stats.int += eq.bonus_int; stats.dex += eq.bonus_dex;
            }
        }
    });
    document.getElementById('st-pdef').innerText = stats.pdef; document.getElementById('st-mdef').innerText = stats.mdef;
    document.getElementById('st-str').innerText = stats.str; document.getElementById('st-int').innerText = stats.int; document.getElementById('st-dex').innerText = stats.dex;
}


// ================= JOGO E BATALHA =================
async function refreshGameData() {
    gameData = await window.pywebview.api.load_data();
    populateEquipSelects();

    const scSelect = document.getElementById('select-scenario');
    scSelect.innerHTML = '<option value="">-- Mudar Cenário --</option>';
    gameData.scenarios.forEach(sc => { scSelect.innerHTML += `<option value="${sc.id}">${sc.name}</option>`; });

    const charOptions = '<option value="">-- Nenhum --</option>' + gameData.characters.map(ch => `<option value="${ch.id}">${ch.name}</option>`).join('');
    document.getElementById('select-player').innerHTML = charOptions;
    document.getElementById('select-enemy').innerHTML = charOptions;
}

function changeScenario() {
    const scId = document.getElementById('select-scenario').value;
    if (!scId) return;
    const scenario = gameData.scenarios.find(s => s.id == scId);
    document.getElementById('game-screen').style.backgroundImage = `url('${scenario.image_path}')`;
    document.getElementById('dialogue-text').innerText = scenario.description;
}

// Esta função mágica desenha Humanos OU Monstros perfeitamente em qualquer Div
function buildCharacterVisually(characterData, side, imgId, layersId) {
    const imgEl = document.getElementById(imgId);
    const layersEl = document.getElementById(layersId);

    if (!characterData) {
        imgEl.style.display = 'none'; layersEl.style.display = 'none';
        return;
    }

    if (characterData.race === 'humano') {
        imgEl.style.display = 'none';
        layersEl.style.display = 'block';
        layersEl.innerHTML = '';
        
        const eqDataMap = typeof characterData.equipment_data === 'string' ? JSON.parse(characterData.equipment_data) : characterData.equipment_data;
        
        if (eqDataMap.base) {
            const body = gameData.bodies.find(b => b.id == eqDataMap.base);
            const bodyImg = side === 'f' ? body?.img_front : body?.img_back;
            if(bodyImg) layersEl.innerHTML += `<img src="${bodyImg}" style="z-index: 0;">`;
        }

        eqTypes.forEach((type, index) => {
            const eqId = eqDataMap[type];
            if (eqId) {
                const eq = gameData.equipments.find(e => e.id == eqId);
                const eqImg = side === 'f' ? eq?.img_front : eq?.img_back;
                if(eqImg) layersEl.innerHTML += `<img src="${eqImg}" style="z-index: ${index + 1};">`;
            }
        });
    } else {
        layersEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
    }
}

function spawnPlayer() {
    const plId = document.getElementById('select-player').value;
    currentPlayer = plId ? gameData.characters.find(c => c.id == plId) : null;
    
    if (currentPlayer) {
        playerHP = currentPlayer.hp;
        document.getElementById('player-name-ui').innerText = currentPlayer.name;
        buildCharacterVisually(currentPlayer, 'b', 'player-image', 'player-layers');
        updateBattleUI();
    } else {
        document.getElementById('player-layers').innerHTML = '';
        document.getElementById('player-image').style.display = 'none';
    }
    checkBattleReady();
}

function spawnEnemy() {
    const enId = document.getElementById('select-enemy').value;
    currentEnemy = enId ? gameData.characters.find(c => c.id == enId) : null;
    
    if(currentEnemy) {
        enemyHP = currentEnemy.hp;
        document.getElementById('enemy-name').innerText = currentEnemy.name;
        buildCharacterVisually(currentEnemy, 'f', 'enemy-image', 'enemy-layers');
        document.getElementById('dialogue-text').innerText = `${currentEnemy.name} apareceu!`;
        updateBattleUI();
    } else {
        document.getElementById('enemy-layers').innerHTML = '';
        document.getElementById('enemy-image').style.display = 'none';
    }
    checkBattleReady();
}

function updateBattleUI() {
    if (currentPlayer) {
        document.getElementById('player-hp-text').innerText = `HP: ${playerHP}/${currentPlayer.hp}`;
        const pPercent = (playerHP / currentPlayer.hp) * 100;
        document.getElementById('player-hp-fill').style.width = `${pPercent}%`;
    }
    if (currentEnemy) {
        document.getElementById('enemy-hp-text').innerText = `HP: ${enemyHP}/${currentEnemy.hp}`;
        const ePercent = (enemyHP / currentEnemy.hp) * 100;
        document.getElementById('enemy-hp-fill').style.width = `${ePercent}%`;
    }
}

function checkBattleReady() {
    const btn = document.getElementById('attack-btn');
    btn.disabled = !(currentPlayer && currentEnemy && enemyHP > 0 && playerHP > 0 && !isTurnBusy);
}

async function performAttack() {
    if (!currentEnemy || currentEnemyHP <= 0 || !currentPlayer) return;

    // 1. Anima o Player pulando para frente
    const pContainer = document.getElementById('player-container');
    pContainer.classList.remove('player-attack');
    void pContainer.offsetWidth; // Força reinício caso clique muito rápido
    pContainer.classList.add('player-attack');

    // 2. Um delay rápido para sincronizar o hit no inimigo
    setTimeout(async () => {
        const eContainer = document.getElementById('enemy-container');
        eContainer.classList.remove('enemy-hit');
        void eContainer.offsetWidth; 
        eContainer.classList.add('enemy-hit');

        // Lógica do Dano
        const result = await window.pywebview.api.attack_enemy(currentEnemy.hp, currentEnemyHP);
        currentEnemyHP = result.new_hp;
        updateHPBar();
        document.getElementById('dialogue-text').innerText = result.message;

        if (result.status === 'dead') {
            document.getElementById('attack-btn').disabled = true;
            setTimeout(() => {
                document.getElementById('enemy-layers').innerHTML = '';
                document.getElementById('enemy-image').style.display = 'none';
            }, 800);
        }
    }, 100); // 100ms é o exato momento que o player chega na frente
}

function updateHPBar() {
    if (!currentEnemy) return;
    document.getElementById('enemy-hp-text').innerText = `HP: ${currentEnemyHP}/${currentEnemy.hp}`;
    const percent = Math.max(0, (currentEnemyHP / currentEnemy.hp) * 100);
    document.getElementById('enemy-hp-fill').style.width = `${percent}%`;
}


// SEQUÊNCIA DE COMBATE POR TURNO
async function startTurnSequence() {
    if (isTurnBusy) return;
    isTurnBusy = true;
    checkBattleReady();

    // --- 1. TURNO DO PLAYER ---
    const pContainer = document.getElementById('player-container');
    pContainer.classList.add('player-attack');
    
    setTimeout(async () => {
        const eContainer = document.getElementById('enemy-container');
        eContainer.classList.add('enemy-hit');
        
        const res = await window.pywebview.api.process_battle_turn(
            currentPlayer.attack, currentEnemy.attack, playerHP, enemyHP, 'player'
        );
        
        enemyHP = res.new_hp;
        updateBattleUI();
        writeDialogue(res.msg);

        setTimeout(() => {
            pContainer.classList.remove('player-attack');
            eContainer.classList.remove('enemy-hit');

            if (enemyHP <= 0) {
                writeDialogue(`Vitória! ${currentEnemy.name} foi derrotado.`);
                finishBattle();
            } else {
                // --- 2. TURNO DO INIMIGO (Revide) ---
                enemyReviveTurn();
            }
        }, 500);
    }, 200);
}

async function enemyReviveTurn() {
    writeDialogue(`${currentEnemy.name} está atacando...`);
    
    setTimeout(async () => {
        const pContainer = document.getElementById('player-container');
        pContainer.classList.add('player-hit');

        const res = await window.pywebview.api.process_battle_turn(
            currentPlayer.attack, currentEnemy.attack, playerHP, enemyHP, 'enemy'
        );

        playerHP = res.new_hp;
        updateBattleUI();
        writeDialogue(res.msg);

        setTimeout(() => {
            pContainer.classList.remove('player-hit');
            if (playerHP <= 0) {
                writeDialogue("Você foi derrotado... GAME OVER.");
                isTurnBusy = false;
                checkBattleReady();
            } else {
                // Turno finalizado, libera para o player atacar de novo
                isTurnBusy = false;
                checkBattleReady();
            }
        }, 500);
    }, 800);
}

function finishBattle() {
    isTurnBusy = false;
    setTimeout(() => {
        document.getElementById('enemy-layers').innerHTML = '';
        document.getElementById('enemy-image').style.display = 'none';
        checkBattleReady();
    }, 1000);
}

function writeDialogue(text) {
    document.getElementById('dialogue-text').innerText = text;
}
