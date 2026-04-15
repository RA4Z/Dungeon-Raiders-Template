function toggleRaceFields() {
    const race = document.getElementById('ch-race').value;
    document.getElementById('simple-fields').style.display = race === 'humano' ? 'none' : 'block';
    document.getElementById('human-fields').style.display = race === 'humano' ? 'block' : 'none';
    
    // Atualiza preview caso mude de aba
    if(race === 'humano') updateDollPreview();
    else {
        document.getElementById('prev-front').innerHTML = `<img src="${document.getElementById('ch-img-f').value}">`;
        document.getElementById('prev-back').innerHTML = `<img src="${document.getElementById('ch-img-b').value}">`;
    }
}

// Preenche todos os Dropdowns de Equipamentos no Form
function buildSelects() {
    const createOptions = (arr, selId) => {
        const sel = document.getElementById(selId);
        if(!sel) return;
        sel.innerHTML = '<option value="">-- Vazio --</option>';
        arr.forEach(item => sel.innerHTML += `<option value="${item.id}">${item.name}</option>`);
    };

    createOptions(window.gameData.bodies, 'sel-base');
    
    // Filtra e injeta nos slots corretos
    window.EQUIP_SLOTS.forEach(slot => {
        if(slot !== 'base') {
            const items = window.gameData.equipments.filter(e => e.type === slot);
            createOptions(items, `sel-${slot}`);
        }
    });
}

// Atualiza a visualização no canto da tela (Paper Doll)
function updateDollPreview() {
    const cF = document.getElementById('prev-front'); 
    const cB = document.getElementById('prev-back');
    cF.innerHTML = ''; cB.innerHTML = ''; 
    
    window.EQUIP_SLOTS.forEach((slot, index) => {
        const elId = `sel-${slot}`;
        const select = document.getElementById(elId);
        if(select && select.value) {
            let itemData;
            if(slot === 'base') itemData = window.gameData.bodies.find(b => b.id == select.value);
            else itemData = window.gameData.equipments.find(e => e.id == select.value);
            
            if(itemData) {
                if(itemData.img_front) cF.innerHTML += `<img src="${itemData.img_front}" style="z-index:${index};">`;
                if(itemData.img_back) cB.innerHTML += `<img src="${itemData.img_back}" style="z-index:${index};">`;
            }
        }
    });
}

async function saveCharacter() {
    const race = document.getElementById('ch-race').value;
    let data = { name: document.getElementById('ch-name').value, hp: parseInt(document.getElementById('ch-hp').value), attack: parseInt(document.getElementById('ch-atk').value), race: race };

    if (race === 'humano') {
        let eqData = {};
        window.EQUIP_SLOTS.forEach(slot => {
            const val = document.getElementById(`sel-${slot}`).value;
            if(val) eqData[slot] = val;
        });
        data.equipment_data = eqData; 
        data.img_front = ""; data.img_back = "";
    } else {
        data.img_front = document.getElementById('ch-img-f').value; 
        data.img_back = document.getElementById('ch-img-b').value; 
        data.equipment_data = "{}";
    }
    
    await window.pywebview.api.add_entity('characters', data);
    document.getElementById('char-msg').innerText = "Personagem Salvo!";
    
    // Limpa Form
    document.getElementById('ch-name').value = '';
    await refreshData();
}