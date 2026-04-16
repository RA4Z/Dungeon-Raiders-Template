async function loadMenuSaves() {
    const saves = await window.pywebview.api.get_saves();
    const container = document.getElementById('saves-list-container');
    if (!container) return; // Segurança
    
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
            <button class="save-del-btn" onclick="event.stopPropagation(); deleteSave(${save.id})">Apagar Save</button>
        `;
        container.appendChild(div);
    });
}

function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if(!modal) return;
    
    modal.style.display = 'flex';
    const select = document.getElementById('ng-body');
    select.innerHTML = '<option value="">-- Escolha --</option>';
    
    window.gameData.bodies.forEach(b => {
        if(b.is_playable === 1) {
            select.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        }
    });
}

function closeNewGameModal() {
    document.getElementById('new-game-modal').style.display = 'none';
}

async function createNewGame() {
    const name = document.getElementById('ng-name').value;
    const bodyId = document.getElementById('ng-body').value;

    if(!name || !bodyId) {
        alert("Preencha o nome e selecione um corpo!");
        return;
    }

    const res = await window.pywebview.api.create_save(name, bodyId);
    if(res.status === 'success') {
        alert("Jogo Criado com Sucesso!");
        closeNewGameModal();
        loadGameSession(res.save); 
    } else {
        alert("Erro ao criar: " + res.message);
    }
}

async function deleteSave(id) {
    if(confirm("Deseja apagar este Save Game permanentemente?")) {
        await window.pywebview.api.delete_entity('saves', id);
        loadMenuSaves();
    }
}

function loadGameSession(save) {
    // 1. Carrega dados do Save para as variáveis globais
    window.activeSaveId = save.id;
    window.playerHP = save.current_hp;
    window.playerGold = save.gold;
    
    try { 
        window.playerInventory = JSON.parse(save.inventory_data); 
    } catch(e) { 
        window.playerInventory = { equipments: [], consumables: {} }; 
    }

    // 2. Cria o objeto do jogador ativo baseado no Save
    window.activePlayer = {
        id: save.id,
        name: save.name,
        hp: save.max_hp,
        attack: save.attack,
        race: 'humano', 
        equipment_data: JSON.parse(save.equipment_data)
    };

    // 3. Atualiza a UI (Verificando se os elementos existem para evitar o erro de 'null')
    const statusEl = document.getElementById('session-status');
    if (statusEl) {
        statusEl.innerText = `Sessão: ${save.name} (Ativo)`;
    }

    // 4. Mostra o botão de "O Jogo" e navega para ele
    const gameBtn = document.getElementById('btn-tab-game');
    if (gameBtn) {
        gameBtn.style.display = 'block';
        // Chama a função global de troca de aba definida no main.js
        if (typeof showTab === "function") {
            showTab('game-tab', gameBtn);
        }
    }

    // 5. Garante que o jogo comece na tela da cidade
    if (typeof backToCity === "function") {
        backToCity();
    }
    
    console.log("Sessão Iniciada com Sucesso:", save.name);
}
