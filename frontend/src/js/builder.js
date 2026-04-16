window.currentCustomDrops =[];

function buildSelects() {
    const data = window.gameData;
    if (!data) return;

    const createOptions = (arr, selId) => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const currentVal = sel.value; 
        sel.innerHTML = '<option value="">-- Vazio --</option>';
        if (arr) arr.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id; opt.textContent = item.name;
            sel.appendChild(opt);
        });
        sel.value = currentVal; 
    };

    createOptions(data.bodies, 'sel-base');
    if (window.EQUIP_SLOTS) {
        window.EQUIP_SLOTS.forEach(slot => {
            if (slot !== 'base') createOptions(data.equipments.filter(e => e.type === slot), `sel-${slot}`);
        });
    }

    const baseGrid = document.getElementById('builder-base-stats');
    if (baseGrid && baseGrid.innerHTML === "") {
        for(let k in window.STAT_MAP.base) {
            baseGrid.innerHTML += `<label>${window.STAT_MAP.base[k]} <input type="number" class="char-base-stat" data-stat="${k}" value="1" min="1" oninput="updateLivePreview()"></label>`;
        }
    }

    const subGrid = document.getElementById('builder-sub-stats');
    if (subGrid && subGrid.innerHTML === "") {
        for(let k in window.STAT_MAP.derived) {
            subGrid.innerHTML += `<label>${window.STAT_MAP.derived[k]} <input type="number" class="char-sub-stat" data-stat="${k}" placeholder="Auto" oninput="updateLivePreview()"></label>`;
        }
    }
    
    // GERA A LISTA DE CHECKBOXES DE ATAQUES
    const attacksContainer = document.getElementById('ch-attacks-list');
    if (attacksContainer && data.attacks) {
        attacksContainer.innerHTML = '';
        data.attacks.forEach(a => {
            attacksContainer.innerHTML += `
                <label style="display:flex; align-items:center; gap:5px; color:#bdc3c7; font-size:0.9em; background:#111; padding:5px; border-radius:3px; cursor:pointer;">
                    <input type="checkbox" class="ch-atk-cb" value="${a.id}"> ${a.name} (${a.atk_type === 'phys' ? 'Físico' : 'Mágico'})
                </label>
            `;
        });
    }

    const cdItem = document.getElementById('cd-item');
    if (cdItem) {
        const currentLootVal = cdItem.value;
        let html = '<option value="">-- Item --</option><optgroup label="Consumíveis">';
        data.consumables.forEach(c => html += `<option value="cons_${c.id}">${c.name}</option>`);
        html += '</optgroup><optgroup label="Equipamentos">';
        data.equipments.forEach(e => html += `<option value="equip_${e.id}">${e.name}</option>`);
        cdItem.innerHTML = html + '</optgroup>';
        cdItem.value = currentLootVal;
    }
}

function toggleRaceFields() {
    const race = document.getElementById('ch-race').value;
    document.getElementById('simple-fields').style.display = race === 'humano' ? 'none' : 'block';
    document.getElementById('human-fields').style.display = race === 'humano' ? 'block' : 'none';
    updateLivePreview();
}

function updateLivePreview() {
    const race = document.getElementById('ch-race').value;
    const cF = document.getElementById('prev-front');
    const cB = document.getElementById('prev-back');
    cF.innerHTML = ''; cB.innerHTML = '';

    if (race === 'humano') {
        window.EQUIP_SLOTS.forEach((slot, index) => {
            const sel = document.getElementById(`sel-${slot}`);
            if (sel && sel.value) {
                const item = slot === 'base' ? window.gameData.bodies.find(b => b.id == sel.value) : window.gameData.equipments.find(e => e.id == sel.value);
                if (item) {
                    if (item.img_front) cF.innerHTML += `<img src="${item.img_front}" style="z-index:${index}; position:absolute;">`;
                    if (item.img_back) cB.innerHTML += `<img src="${item.img_back}" style="z-index:${index}; position:absolute;">`;
                }
            }
        });
    } else {
        const iF = document.getElementById('ch-img-f').value;
        const iB = document.getElementById('ch-img-b').value;
        if(iF) cF.innerHTML = `<img src="${iF}" style="position:absolute;">`;
        if(iB) cB.innerHTML = `<img src="${iB}" style="position:absolute;">`;
    }

    let base = {};
    document.querySelectorAll('.char-base-stat').forEach(i => base[i.dataset.stat] = parseInt(i.value) || 1);
    
    let overrides = {};
    if (race === 'monstro') {
        document.querySelectorAll('.char-sub-stat').forEach(i => {
            if(i.value !== "") overrides[i.dataset.stat] = parseFloat(i.value);
        });
    }

    let bonus = {};
    if (race === 'humano') {
        window.EQUIP_SLOTS.forEach(slot => {
            const val = document.getElementById(`sel-${slot}`).value;
            if(val && slot !== 'base') {
                const eq = window.gameData.equipments.find(e => e.id == val);
                if(eq && eq.stats_modifiers) {
                    let mods = JSON.parse(eq.stats_modifiers);
                    for(let k in mods) bonus[k] = (bonus[k] || 0) + parseFloat(mods[k]);
                }
            }
        });
    }

    const finalStats = window.calcStatsLocal(base, bonus, overrides);
    
    const viewGrid = document.getElementById('live-stats-preview');
    if (viewGrid) {
        viewGrid.innerHTML = '';
        for(let k in finalStats.computed) {
            let name = window.STAT_MAP.derived[k];
            let val = finalStats.computed[k].toFixed(1);
            viewGrid.innerHTML += `<span><strong>${name}:</strong> <span style="color:#2ecc71;">${val}</span></span>`;
        }
    }
}

function addCustomDrop() {
    const el = document.getElementById('cd-item');
    const ch = document.getElementById('cd-chance').value;
    if(!el.value || !ch) return;
    const [t, id] = el.value.split('_');
    window.currentCustomDrops.push({ type: t, id: parseInt(id), chance: parseInt(ch), name: el.options[el.selectedIndex].text });
    renderCustomDrops();
}
function renderCustomDrops() {
    document.getElementById('cd-list').innerHTML = window.currentCustomDrops.map((d, i) => `<li style="background:#111; padding:5px; border:1px solid #444; display:flex; justify-content:space-between; margin-top:3px;">${d.name} (${d.chance}%) <button onclick="window.currentCustomDrops.splice(${i},1); renderCustomDrops();">X</button></li>`).join('');
}

async function saveCharacter() {
    const editId = document.getElementById('edit-char-id').value;
    const name = document.getElementById('ch-name').value;
    const race = document.getElementById('ch-race').value;
    
    if (!name) return window.showToast("Dê um nome ao personagem!", "error");

    let base = {};
    document.querySelectorAll('.char-base-stat').forEach(i => {
        base[i.dataset.stat] = parseInt(i.value) || 1;
    });
    
    let selectedAttacks = [];
    document.querySelectorAll('.ch-atk-cb:checked').forEach(cb => selectedAttacks.push(parseInt(cb.value)));
    if (selectedAttacks.length === 0) selectedAttacks = [1]; 

    let data = {
        name: name,
        race: race,
        base_stats: JSON.stringify(base),
        attacks: JSON.stringify(selectedAttacks)
    };

    if (race === 'humano') {
        let eq = {};
        window.EQUIP_SLOTS.forEach(s => {
            const el = document.getElementById(`sel-${s}`);
            if (el && el.value) eq[s] = el.value;
        });
        data.equipment_data = JSON.stringify(eq);
        data.img_front = "";
        data.img_back = "";
        data.custom_drops = "[]";
        data.custom_substats = "{}";
    } else {
        let sub = {};
        document.querySelectorAll('.char-sub-stat').forEach(i => {
            if (i.value !== "") sub[i.dataset.stat] = parseFloat(i.value);
        });
        data.img_front = document.getElementById('ch-img-f').value;
        data.img_back = document.getElementById('ch-img-b').value;
        data.custom_drops = JSON.stringify(window.currentCustomDrops);
        data.custom_substats = JSON.stringify(sub);
        data.equipment_data = "{}";
    }

    let res;
    if (editId) {
        res = await window.pywebview.api.update_entity('characters', editId, data);
    } else {
        res = await window.pywebview.api.add_entity('characters', data);
    }

    if (res.status === "success") {
        window.showToast("Personagem Salvo!", "success");
        document.getElementById('edit-char-id').value = "";
        document.getElementById('ch-name').value = "";
        window.currentCustomDrops = [];
        renderCustomDrops();
        await window.refreshData();
    } else {
        window.showToast("Erro: " + res.message, "error");
    }
}