
window.currentCustomDrops = [];

window.buildSelects = function () {
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
        for (let k in window.STAT_MAP.base) {
            // Repare que o oninput chama window.updateLivePreview()
            baseGrid.innerHTML += `<label>${window.STAT_MAP.base[k]} <input type="number" class="char-base-stat" data-stat="${k}" value="1" min="1" oninput="window.updateLivePreview()"></label>`;
        }
    }

    const subGrid = document.getElementById('builder-sub-stats');
    if (subGrid && subGrid.innerHTML === "") {
        for (let k in window.STAT_MAP.derived) {
            subGrid.innerHTML += `<label>${window.STAT_MAP.derived[k]} <input type="number" class="char-sub-stat" data-stat="${k}" placeholder="Auto" oninput="window.updateLivePreview()"></label>`;
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
};

window.toggleRaceFields = function () {
    const race = document.getElementById('ch-race').value;
    document.getElementById('simple-fields').style.display = race === 'humano' ? 'none' : 'block';
    document.getElementById('human-fields').style.display = race === 'humano' ? 'block' : 'none';
    window.updateLivePreview();
};

// Função principal de update (Chama visual + cálculos separadamente)
window.updateLivePreview = function () {
    _updateVisualPreview();

    // Se o arquivo de cálculos foi carregado com sucesso, manda calcular os status
    if (typeof window.updateLiveStatsPreview === 'function') {
        window.updateLiveStatsPreview();
    }
};

// Lida APENAS com imagens do boneco (Paper Doll)
function _updateVisualPreview() {
    const race = document.getElementById('ch-race').value;
    const cF = document.getElementById('prev-front');
    const cB = document.getElementById('prev-back');
    if (!cF || !cB) return;

    cF.innerHTML = '';
    cB.innerHTML = '';

    if (race === 'humano') {
        window.EQUIP_SLOTS.forEach((slot, index) => {
            const sel = document.getElementById(`sel-${slot}`);
            if (sel && sel.value) {
                const item = slot === 'base'
                    ? window.gameData.bodies.find(b => b.id == sel.value)
                    : window.gameData.equipments.find(e => e.id == sel.value);

                if (item) {
                    if (item.img_front) cF.innerHTML += `<img src="${item.img_front}" style="z-index:${index}; position:absolute;">`;
                    if (item.img_back) cB.innerHTML += `<img src="${item.img_back}" style="z-index:${index}; position:absolute;">`;
                }
            }
        });
    } else {
        const iF = document.getElementById('ch-img-f').value;
        const iB = document.getElementById('ch-img-b').value;
        if (iF) cF.innerHTML = `<img src="${iF}" style="position:absolute;">`;
        if (iB) cB.innerHTML = `<img src="${iB}" style="position:absolute;">`;
    }
}

window.addCustomDrop = function () {
    const el = document.getElementById('cd-item');
    const ch = document.getElementById('cd-chance').value;
    if (!el.value || !ch) return;
    const [t, id] = el.value.split('_');
    window.currentCustomDrops.push({ type: t, id: parseInt(id), chance: parseInt(ch), name: el.options[el.selectedIndex].text });
    window.renderCustomDrops();
};

window.renderCustomDrops = function () {
    const list = document.getElementById('cd-list');
    if (!list) return;
    list.innerHTML = window.currentCustomDrops.map((d, i) => `
        <li style="background:#111; padding:5px; border:1px solid #444; display:flex; justify-content:space-between; margin-top:3px;">
            ${d.name} (${d.chance}%) 
            <button onclick="window.currentCustomDrops.splice(${i},1); window.renderCustomDrops();">X</button>
        </li>
    `).join('');
};


window.saveCharacter = async function () {
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
        window.renderCustomDrops();
        await window.refreshData();

        // Limpa os campos após salvar
        document.querySelectorAll('.char-base-stat').forEach(i => i.value = 1);
        document.querySelectorAll('.char-sub-stat').forEach(i => i.value = "");
        document.querySelectorAll('.ch-atk-cb').forEach(cb => cb.checked = false);

        // Se houver uma tabela de banco de dados aberta, atualiza ela também
        if (typeof renderCrudTable === 'function') renderCrudTable();

    } else {
        window.showToast("Erro: " + res.message, "error");
    }
};

/**
 * Prepara o formulário para edição de um personagem existente.
 * Chamado pelo admin_manager.js ou database.js
 */
window.loadCharacterToBuilder = function (item) {
    document.getElementById('edit-char-id').value = item.id;
    document.getElementById('ch-name').value = item.name;
    document.getElementById('ch-race').value = item.race;

    // Carrega Atributos Base
    let base = {};
    try { base = JSON.parse(item.base_stats || '{}'); } catch (e) { }
    document.querySelectorAll('.char-base-stat').forEach(i => {
        i.value = base[i.dataset.stat] || 1;
    });

    // Carrega Ataques
    let atks = [];
    try { atks = JSON.parse(item.attacks || '[1]'); } catch (e) { }
    document.querySelectorAll('.ch-atk-cb').forEach(cb => {
        cb.checked = atks.includes(parseInt(cb.value));
    });

    if (item.race === 'humano') {
        let eq = {};
        try { eq = JSON.parse(item.equipment_data || '{}'); } catch (e) { }
        (window.EQUIP_SLOTS || []).forEach(slot => {
            const sel = document.getElementById(`sel-${slot}`);
            if (sel) sel.value = eq[slot] || "";
        });
    } else {
        // Carrega dados de Monstro
        document.getElementById('ch-img-f').value = item.img_front || "";
        document.getElementById('ch-img-b').value = item.img_back || "";

        let subs = {};
        try { subs = JSON.parse(item.custom_substats || '{}'); } catch (e) { }
        document.querySelectorAll('.char-sub-stat').forEach(i => {
            i.value = subs[i.dataset.stat] || "";
        });

        try {
            window.currentCustomDrops = JSON.parse(item.custom_drops || '[]');
        } catch (e) {
            window.currentCustomDrops = [];
        }
        window.renderCustomDrops();
    }

    window.toggleRaceFields();
    window.updateLivePreview();
};
