window.currentCustomDrops = []; // Variável Global Temporária

function toggleRaceFields() {
    const race = document.getElementById('ch-race').value;
    const simpleFields = document.getElementById('simple-fields');
    const humanFields = document.getElementById('human-fields');
    const previewPanel = document.getElementById('preview-panel');

    if (race === 'humano') {
        simpleFields.style.display = 'none';
        humanFields.style.display = 'block';
        previewPanel.style.display = 'block';
        updateDollPreview();
    } else {
        simpleFields.style.display = 'block';
        humanFields.style.display = 'none';
        previewPanel.style.display = 'block';

        const cF = document.getElementById('prev-front');
        const imgPath = document.getElementById('ch-img-f').value;
        cF.innerHTML = imgPath ? `<img src="${imgPath}" style="width:100%; height:100%; object-fit:contain;">` : '';
    }
}

function buildSelects() {
    console.log("Populando selects com os dados...");

    const createOptions = (arr, selId) => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Vazio / Selecionar --</option>';
        if (arr && arr.length > 0) {
            arr.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name || `Item ${item.id}`;
                sel.appendChild(opt);
            });
        }
    };

    createOptions(window.gameData.bodies, 'sel-base');
    window.EQUIP_SLOTS.forEach(slot => {
        if (slot !== 'base') {
            const itemsFiltrados = window.gameData.equipments.filter(e => e.type === slot);
            createOptions(itemsFiltrados, `sel-${slot}`);
        }
    });

    // NOVO: Popula o Select de LOOTS Customizados para monstros
    const cdItem = document.getElementById('cd-item');
    if (cdItem) {
        cdItem.innerHTML = '<option value="">-- Selecione o Item --</option>';

        cdItem.innerHTML += '<optgroup label="Consumíveis (Poções, etc)">';
        window.gameData.consumables.forEach(c => {
            cdItem.innerHTML += `<option value="cons_${c.id}">${c.name}</option>`;
        });
        cdItem.innerHTML += '</optgroup>';

        cdItem.innerHTML += '<optgroup label="Equipamentos (Armas, Roupas)">';
        window.gameData.equipments.forEach(e => {
            cdItem.innerHTML += `<option value="equip_${e.id}">${e.name}</option>`;
        });
        cdItem.innerHTML += '</optgroup>';
    }
}

// Funções para gerenciar os loots customizados na tela
window.addCustomDrop = function () {
    const val = document.getElementById('cd-item').value;
    const chance = parseInt(document.getElementById('cd-chance').value) || 0;

    if (!val || chance <= 0) {
        alert("Selecione um item e coloque uma chance maior que 0%");
        return;
    }

    const [type, id] = val.split('_'); // Vai separar 'cons_1' em type='cons' e id='1'

    // Pega o nome do item que está escrito no option selecionado
    const selElement = document.getElementById('cd-item');
    const name = selElement.options[selElement.selectedIndex].text;

    window.currentCustomDrops.push({ type: type, id: parseInt(id), chance: chance, name: name });
    renderCustomDrops();
};

window.removeCustomDrop = function (idx) {
    window.currentCustomDrops.splice(idx, 1);
    renderCustomDrops();
};

function renderCustomDrops() {
    const list = document.getElementById('cd-list');
    list.innerHTML = '';
    window.currentCustomDrops.forEach((drop, idx) => {
        list.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:5px 10px; margin-bottom:5px; border:1px solid #444; border-radius:4px;">
                <span style="color:#f1c40f;">${drop.name} <strong style="color:#2ecc71;">(${drop.chance}%)</strong></span>
                <button type="button" onclick="removeCustomDrop(${idx})" style="background:#c0392b; border:none; color:white; padding:5px 10px; cursor:pointer; width:auto; margin:0; border-radius:3px;">X</button>
            </li>`;
    });
}

function updateDollPreview() {
    const cF = document.getElementById('prev-front');
    const cB = document.getElementById('prev-back');
    if (!cF || !cB) return;

    cF.innerHTML = '';
    cB.innerHTML = '';

    window.EQUIP_SLOTS.forEach((slot, index) => {
        const select = document.getElementById(`sel-${slot}`);
        if (select && select.value) {
            let itemData;
            if (slot === 'base') itemData = window.gameData.bodies.find(b => b.id == select.value);
            else itemData = window.gameData.equipments.find(e => e.id == select.value);

            if (itemData) {
                if (itemData.img_front) {
                    const img = document.createElement('img');
                    img.src = itemData.img_front;
                    img.style.zIndex = index;
                    img.style.position = 'absolute';
                    cF.appendChild(img);
                }
                if (itemData.img_back) {
                    const img = document.createElement('img');
                    img.src = itemData.img_back;
                    img.style.zIndex = index;
                    img.style.position = 'absolute';
                    cB.appendChild(img);
                }
            }
        }
    });
}

async function saveCharacter() {
    const name = document.getElementById('ch-name').value;
    if (!name) { alert("Dê um nome ao personagem!"); return; }

    const race = document.getElementById('ch-race').value;
    let data = {
        name: name,
        hp: parseInt(document.getElementById('ch-hp').value) || 100,
        attack: parseInt(document.getElementById('ch-atk').value) || 10,
        race: race
    };

    if (race === 'humano') {
        let eqData = {};
        window.EQUIP_SLOTS.forEach(slot => {
            const val = document.getElementById(`sel-${slot}`).value;
            if (val) eqData[slot] = val;
        });
        data.equipment_data = JSON.stringify(eqData);
        data.img_front = "";
        data.img_back = "";
        data.custom_drops = "[]"; // Humanos não usam a tabela customizada
    } else {
        data.img_front = document.getElementById('ch-img-f').value;
        data.img_back = document.getElementById('ch-img-b').value;
        data.equipment_data = "{}";

        // Passa os drops montados pelo jogador
        data.custom_drops = JSON.stringify(window.currentCustomDrops);
    }

    const res = await window.pywebview.api.add_entity('characters', data);
    document.getElementById('char-msg').innerText = res.message;

    // Limpa a lista pra não atrapalhar a criação do próximo monstro
    window.currentCustomDrops = [];
    renderCustomDrops();

    // 2. Limpa os campos de texto e resetar prévias
    document.getElementById('ch-name').value = "";
    document.getElementById('ch-hp').value = "100";
    document.getElementById('ch-atk').value = "10";
    document.getElementById('prev-front').innerHTML = "";
    document.getElementById('prev-back').innerHTML = "";

    // 3. Atualiza os dados globais para o herói aparecer no seletor da cidade
    await window.refreshData();
}

window.addEventListener('pywebviewready', () => {
    buildSelects();
});