let currentSkinColor = "#ffffff";

async function loadMenuSaves() {
    const saves = await window.pywebview.api.get_saves();
    const container = document.getElementById('saves-list-container');
    if (!container) return; 
    
    container.innerHTML = '';
    if (!saves || saves.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; width:100%; text-align:center;">Nenhum jogo salvo encontrado.</p>';
        return;
    }

    saves.forEach(save => {
        const div = document.createElement('div');
        div.className = 'save-card';
        div.onclick = () => loadGameSession(save);
        div.innerHTML = `
            <h3>${save.name}</h3>
            <div class="save-stats">
                HP: ${save.current_hp} / ${save.max_hp}<br>
                Ouro: ${save.gold} Moedas<br>
                Ataque: ${save.attack}<br>
            </div>
            <button class="save-del-btn" onclick="event.stopPropagation(); deleteSave(${save.id})">Apagar</button>
        `;
        container.appendChild(div);
    });
}

function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if(!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('ng-name').value = '';
    
    // 1. Popula Corpo
    const selBody = document.getElementById('ng-body');
    selBody.innerHTML = '<option value="">-- Corpo Base --</option>';
    window.gameData.bodies.forEach(b => {
        if(b.is_playable === 1) selBody.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });

    // 2. Popula Rosto
    const selFace = document.getElementById('ng-face');
    selFace.innerHTML = '<option value="">-- Sem Rosto --</option>';
    window.gameData.equipments.filter(e => e.type === 'face').forEach(f => {
        selFace.innerHTML += `<option value="${f.id}">${f.name}</option>`;
    });

    // 3. Popula Cabelo
    const selHair = document.getElementById('ng-hair');
    selHair.innerHTML = '<option value="">-- Careca --</option>';
    window.gameData.equipments.filter(e => e.type === 'hair').forEach(h => {
        selHair.innerHTML += `<option value="${h.id}">${h.name}</option>`;
    });

    // 4. Paleta de Cores (Shader)
    const colors =[
        { code: '#ffffff', name: 'Original' }, { code: '#ffdfc4', name: 'Pálida' },
        { code: '#d4a373', name: 'Morena' }, { code: '#8d5524', name: 'Escura' },
        { code: '#4b3621', name: 'Muito Escura' }, { code: '#7cb342', name: 'Orc' },
        { code: '#e53935', name: 'Demônio' }, { code: '#5e35b1', name: 'Elfo Negro' }
    ];
    
    const colorContainer = document.getElementById('ng-colors');
    colorContainer.innerHTML = '';
    colors.forEach(c => {
        const btn = document.createElement('div');
        btn.style = `width:30px; height:30px; background:${c.code}; border-radius:50%; border:2px solid ${c.code === '#ffffff' ? '#e67e22' : '#333'}; cursor:pointer;`;
        btn.title = c.name;
        btn.onclick = () => {
            currentSkinColor = c.code;
            Array.from(colorContainer.children).forEach(child => child.style.borderColor = '#333');
            btn.style.borderColor = '#e67e22';
            updateNewGamePreview();
        };
        colorContainer.appendChild(btn);
    });

    currentSkinColor = "#ffffff"; // reseta
    updateNewGamePreview();
}

// A função que usa o Shader Async para montar o boneco no Novo Jogo
async function updateNewGamePreview() {
    const bodyId = document.getElementById('ng-body').value;
    const faceId = document.getElementById('ng-face').value;
    const hairId = document.getElementById('ng-hair').value;
    
    const cF = document.getElementById('ng-prev-front');
    const cB = document.getElementById('ng-prev-back');
    cF.innerHTML = ''; cB.innerHTML = '';

    if (!bodyId) return;

    // Constrói uma Fake Equipment Data pra passar no renderizador universal
    const fakeEq = { base: bodyId, skin_color: currentSkinColor };
    if(faceId) fakeEq.face = faceId;
    if(hairId) fakeEq.hair = hairId;

    const fakeChar = { race: 'humano', equipment_data: fakeEq };

    await window.buildBattleCharacter(fakeChar, 'f', null, 'ng-prev-front');
    await window.buildBattleCharacter(fakeChar, 'b', null, 'ng-prev-back');
}

function closeNewGameModal() { document.getElementById('new-game-modal').style.display = 'none'; }

async function createNewGame() {
    const name = document.getElementById('ng-name').value;
    const bodyId = document.getElementById('ng-body').value;
    const faceId = document.getElementById('ng-face').value;
    const hairId = document.getElementById('ng-hair').value;

    if(!name || !bodyId) { alert("Nome e Corpo Base são obrigatórios!"); return; }

    const res = await window.pywebview.api.create_save(name, bodyId, faceId, hairId, currentSkinColor);
    if(res.status === 'success') {
        closeNewGameModal();
        loadGameSession(res.save); 
    } else {
        alert("Erro ao criar: " + res.message);
    }
}

async function deleteSave(id) {
    if(confirm("Deseja apagar este Save Game?")) {
        await window.pywebview.api.delete_entity('saves', id);
        loadMenuSaves();
    }
}

function loadGameSession(save) {
    window.activeSaveId = save.id;
    window.playerHP = save.current_hp;
    window.playerGold = save.gold;
    try { window.playerInventory = JSON.parse(save.inventory_data); } 
    catch(e) { window.playerInventory = { equipments:[], consumables: {} }; }

    window.activePlayer = {
        id: save.id, name: save.name, hp: save.max_hp, attack: save.attack, race: 'humano', 
        equipment_data: JSON.parse(save.equipment_data)
    };

    const statusEl = document.getElementById('session-status');
    if (statusEl) statusEl.innerText = `Sessão: ${save.name} (Ativo)`;
    const gameBtn = document.getElementById('btn-tab-game');
    if (gameBtn) {
        gameBtn.style.display = 'block';
        if (typeof showTab === "function") showTab('game-tab', gameBtn);
    }
    if (typeof backToCity === "function") backToCity();
}