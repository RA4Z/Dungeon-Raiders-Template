// web/js/builder.js
window.currentCustomDrops = [];

function buildSelects() {
    const data = window.gameData;
    if (!data) return;

    const createOptions = (arr, selId) => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Vazio / Selecionar --</option>';
        if (arr) {
            arr.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                sel.appendChild(opt);
            });
        }
    };

    // Popula Corpos
    createOptions(data.bodies, 'sel-base');

    // Popula Slots de Equipamento
    if (window.EQUIP_SLOTS) {
        window.EQUIP_SLOTS.forEach(slot => {
            if (slot !== 'base') {
                const filtered = data.equipments.filter(e => e.type === slot);
                createOptions(filtered, `sel-${slot}`);
            }
        });
    }

    // Popula Lista de Drops para Monstros
    const cdItem = document.getElementById('cd-item');
    if (cdItem) {
        cdItem.innerHTML = '<option value="">-- Selecione o Item --</option>';
        let html = '<optgroup label="Consumíveis">';
        data.consumables.forEach(c => html += `<option value="cons_${c.id}">${c.name}</option>`);
        html += '</optgroup><optgroup label="Equipamentos">';
        data.equipments.forEach(e => html += `<option value="equip_${e.id}">${e.name}</option>`);
        html += '</optgroup>';
        cdItem.innerHTML = html;
    }
}

function toggleRaceFields() {
    const raceEl = document.getElementById('ch-race');
    if (!raceEl) return;
    const race = raceEl.value;
    
    const simple = document.getElementById('simple-fields');
    const human = document.getElementById('human-fields');
    
    if (simple) simple.style.display = race === 'humano' ? 'none' : 'block';
    if (human) human.style.display = race === 'humano' ? 'block' : 'none';
    
    if (race === 'humano') updateDollPreview();
}

function updateDollPreview() {
    const cF = document.getElementById('prev-front');
    const cB = document.getElementById('prev-back');
    if (!cF || !cB) return;

    cF.innerHTML = ''; cB.innerHTML = '';
    window.EQUIP_SLOTS.forEach((slot, index) => {
        const sel = document.getElementById(`sel-${slot}`);
        if (sel && sel.value) {
            const item = slot === 'base' ? 
                window.gameData.bodies.find(b => b.id == sel.value) : 
                window.gameData.equipments.find(e => e.id == sel.value);
            
            if (item) {
                if (item.img_front) cF.innerHTML += `<img src="${item.img_front}" style="z-index:${index}; position:absolute;">`;
                if (item.img_back) cB.innerHTML += `<img src="${item.img_back}" style="z-index:${index}; position:absolute;">`;
            }
        }
    });
}

function addCustomDrop() {
    const itemEl = document.getElementById('cd-item');
    const chanceEl = document.getElementById('cd-chance');
    if (!itemEl || !chanceEl) return;

    const val = itemEl.value;
    const chance = parseInt(chanceEl.value);
    if (!val || !chance) return;

    const [type, id] = val.split('_');
    const name = itemEl.options[itemEl.selectedIndex].text;
    window.currentCustomDrops.push({ type, id, chance, name });
    renderCustomDrops();
}

function renderCustomDrops() {
    const list = document.getElementById('cd-list');
    if (!list) return;
    list.innerHTML = window.currentCustomDrops.map((d, i) => `
        <li style="background:#111; padding:5px; margin-top:2px; border:1px solid #444; display:flex; justify-content:space-between;">
            ${d.name} (${d.chance}%) <button onclick="window.currentCustomDrops.splice(${i},1); renderCustomDrops();">X</button>
        </li>
    `).join('');
}

async function saveCharacter() {
    const name = document.getElementById('ch-name').value;
    const race = document.getElementById('ch-race').value;
    if (!name) return alert("Nome obrigatório");

    let data = {
        name,
        hp: parseInt(document.getElementById('ch-hp').value) || 100,
        attack: parseInt(document.getElementById('ch-atk').value) || 10,
        race: race
    };

    if (race === 'humano') {
        let eq = {};
        window.EQUIP_SLOTS.forEach(s => eq[s] = document.getElementById(`sel-${s}`).value);
        data.equipment_data = JSON.stringify(eq);
        data.custom_drops = "[]";
    } else {
        data.img_front = document.getElementById('ch-img-f').value;
        data.img_back = document.getElementById('ch-img-b').value;
        data.custom_drops = JSON.stringify(window.currentCustomDrops);
    }

    await window.pywebview.api.add_entity('characters', data);
    alert("Salvo!");
    window.refreshData();
}