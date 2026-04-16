let currentSkinColor = "#ffffff";
let newGameStats = { 'for': 1, 'int': 1, 'des': 1, 'car': 1, 'res': 1 };
const MAX_POINTS = 15;

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
        let base = { 'for': 1, 'int': 1, 'des': 1 };
        try { if (save.base_stats) base = JSON.parse(save.base_stats); } catch (e) { }

        const div = document.createElement('div');
        div.className = 'save-card';
        div.onclick = () => loadGameSession(save);

        // Exibe "Cheio" se for a primeira vez jogando, para evitar o "9999" do DB
        let hpExibido = save.current_hp === 9999 ? "Cheio" : save.current_hp;

        div.innerHTML = `
            <h3>${save.name}</h3>
            <div class="save-stats">
                HP Atual: <span style="color:#2ecc71; font-weight:bold;">${hpExibido}</span><br>
                Ouro: <span style="color:#f1c40f; font-weight:bold;">${save.gold} Moedas</span><br>
                <div style="margin-top:8px; border-top:1px solid #444; padding-top:5px;">
                    <small>FOR ${base['for']} | INT ${base['int']} | DES ${base['des']}</small>
                </div>
            </div>
            <button class="save-del-btn" onclick="event.stopPropagation(); deleteSave(${save.id})">Apagar Jogo</button>
        `;
        container.appendChild(div);
    });
}
function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('ng-name').value = '';

    // 1. Popula Corpo
    const selBody = document.getElementById('ng-body');
    selBody.innerHTML = '<option value="">-- Corpo Base --</option>';
    window.gameData.bodies.forEach(b => {
        if (b.is_playable === 1) selBody.innerHTML += `<option value="${b.id}">${b.name}</option>`;
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
    const colors = [
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

    newGameStats = { 'for': 1, 'int': 1, 'des': 1, 'car': 1, 'res': 1 };
    renderNewGameStats();

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
    if (faceId) fakeEq.face = faceId;
    if (hairId) fakeEq.hair = hairId;

    const fakeChar = { race: 'humano', equipment_data: fakeEq };

    await window.buildBattleCharacter(fakeChar, 'f', null, 'ng-prev-front');
    await window.buildBattleCharacter(fakeChar, 'b', null, 'ng-prev-back');
}

function closeNewGameModal() { document.getElementById('new-game-modal').style.display = 'none'; }

function renderNewGameStats() {
    const grid = document.getElementById('ng-stats-grid');
    if (!grid) return;

    let spent = Object.values(newGameStats).reduce((a, b) => a + b, 0);
    let left = MAX_POINTS - spent;
    document.getElementById('ng-pts-left').innerText = left;

    grid.innerHTML = '';
    Object.keys(window.STAT_MAP.base).forEach(key => {
        grid.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; color:#fff;">
                <span>${window.STAT_MAP.base[key]}</span>
                <div>
                    <button onclick="changeNewGameStat('${key}', -1)" style="padding:2px 8px; background:#c0392b; border:none; color:#fff; cursor:pointer; font-weight:bold;">-</button>
                    <span style="display:inline-block; width:20px; text-align:center; font-weight:bold;">${newGameStats[key]}</span>
                    <button onclick="changeNewGameStat('${key}', 1)" style="padding:2px 8px; background:#27ae60; border:none; color:#fff; cursor:pointer; font-weight:bold;">+</button>
                </div>
            </div>
        `;
    });
}

window.changeNewGameStat = function (key, val) {
    let spent = Object.values(newGameStats).reduce((a, b) => a + b, 0);
    let left = MAX_POINTS - spent;

    if (val > 0 && left <= 0) return; // Limite máximo
    if (val < 0 && newGameStats[key] <= 1) return; // Mínimo é 1

    newGameStats[key] += val;
    renderNewGameStats();
}

async function createNewGame() {
    const name = document.getElementById('ng-name').value;
    const bodyId = document.getElementById('ng-body').value;
    const faceId = document.getElementById('ng-face').value;
    const hairId = document.getElementById('ng-hair').value;

    let spent = Object.values(newGameStats).reduce((a, b) => a + b, 0);
    if (spent < MAX_POINTS) {
        if (!confirm("Você ainda tem pontos sobrando! Deseja continuar assim mesmo?")) return;
    }

    if (!name || !bodyId) { alert("Nome e Corpo Base são obrigatórios!"); return; }

    const res = await window.pywebview.api.create_save(name, bodyId, faceId, hairId, currentSkinColor, newGameStats);
    if (res.status === 'success') {
        closeNewGameModal();
        loadGameSession(res.save);
    } else {
        alert("Erro ao criar: " + res.message);
    }
}

async function deleteSave(id) {
    if (confirm("Deseja apagar este Save Game?")) {
        await window.pywebview.api.delete_entity('saves', id);
        loadMenuSaves();
    }
}

async function loadGameSession(save) {
    window.activeSaveId = save.id;
    window.playerGold = save.gold;

    // Tenta carregar o inventário, se falhar cria um novo
    try {
        window.playerInventory = JSON.parse(save.inventory_data);
    } catch (e) {
        window.playerInventory = { equipments: [], consumables: {} };
    }

    // Monta o objeto do jogador baseado no save para a Engine de Status
    window.activePlayer = {
        id: save.id,
        name: save.name,
        race: 'humano',
        equipment_data: JSON.parse(save.equipment_data),
        base_stats: JSON.parse(save.base_stats)
    };

    // Recalcula todos os status (HP Máximo, Defesa, etc.)
    await window.refreshPlayerStats();

    // --- CORREÇÃO AUTOMÁTICA DE SAVES ANTIGOS (undefined/null) ---
    // Se a vida no banco for inválida, nula ou o valor inicial de teste (9999), 
    // nós resetamos ela para a vida máxima calculada pela engine.
    if (save.current_hp === null || isNaN(save.current_hp) || save.current_hp === 9999) {
        window.playerHP = window.playerFullStats.computed.hp;
    } else {
        window.playerHP = save.current_hp;
    }

    // Atualiza o texto da barra de status na cidade
    const statusEl = document.getElementById('session-status');
    if (statusEl) {
        statusEl.innerText = `Herói: ${save.name} | Ouro: ${window.playerGold}`;
    }

    // Mostra o botão verde de "O Jogo" e navega para a cidade
    const gameBtn = document.getElementById('btn-tab-game');
    if (gameBtn) {
        gameBtn.style.display = 'block';
        if (typeof showTab === "function") {
            showTab('game-tab', gameBtn);
        }
    }

    // Salva imediatamente no banco para limpar qualquer valor "null" que existia antes
    if (typeof syncInventoryToDB === "function") {
        await syncInventoryToDB();
    }

    // Garante que o jogo comece na visão da cidade
    if (typeof backToCity === "function") {
        backToCity();
    }

    console.log("Sessão carregada e corrigida com sucesso!");
}
