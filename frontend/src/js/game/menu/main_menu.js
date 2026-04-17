// frontend/src/js/main_menu.js
let currentSkinColor = "#ffffff";
let newGameStats = { 'for': 1, 'int': 1, 'des': 1, 'car': 1, 'res': 1 };
let newGameGender = 'male';
const MAX_POINTS = 15;

async function loadMenuSaves() {
    const saves = await window.pywebview.api.get_saves();
    const container = document.getElementById('saves-list-container');
    if (!container) return;
    container.innerHTML = saves.map(save => `
        <div class="save-card" onclick="loadGameSession(${JSON.stringify(save).replace(/"/g, '&quot;')})">
            <h3>${save.name} <span style="font-size:0.8em; color:#7f8c8d;">${save.gender === 'female' ? '♀' : '♂'}</span></h3>
            <div class="save-stats">🪙 ${save.gold} | Dia: ${save.days_passed}</div>
            <button class="save-del-btn" onclick="event.stopPropagation(); deleteSave(${save.id})">Apagar</button>
        </div>`).join('');
}

window.selectNewGameGender = function (gender) {
    newGameGender = gender;
    document.getElementById('ng-btn-male').classList.toggle('active', gender === 'male');
    document.getElementById('ng-btn-female').classList.toggle('active', gender === 'female');
    const badge = document.getElementById('ng-gender-badge');
    if (badge) badge.innerHTML = gender === 'female' ? '♀ Feminino' : '♂ Masculino';
    // Refiltra corpos e equipamentos disponíveis por gênero
    _populateNewGameSelects();
    updateNewGamePreview();
};

function _populateNewGameSelects() {
    const gender = newGameGender;

    // Corpos: filtra por gênero (se não tiver img feminina, só masculino pode usar)
    const selBody = document.getElementById('ng-body');
    if (selBody) {
        const cur = selBody.value;
        selBody.innerHTML = '<option value="">-- Corpo Base --</option>';
        window.gameData.bodies.forEach(b => {
            if (!b.is_playable) return;
            // Se gênero feminino selecionado e corpo não tem imagem feminina: pula
            if (gender === 'female' && !b.img_front_f) return;
            // Se gênero masculino e corpo não tem imagem masculina: pula
            if (gender === 'male' && !b.img_front) return;
            selBody.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
        if (cur) selBody.value = cur;
    }

    // Rosto
    const selFace = document.getElementById('ng-face');
    if (selFace) {
        const cur = selFace.value;
        selFace.innerHTML = '<option value="">-- Sem Rosto --</option>';
        window.gameData.equipments.filter(e => e.type === 'face').forEach(f => {
            if (!_equipAllowedForGender(f, gender)) return;
            selFace.innerHTML += `<option value="${f.id}">${f.name}</option>`;
        });
        if (cur) selFace.value = cur;
    }

    // Cabelo
    const selHair = document.getElementById('ng-hair');
    if (selHair) {
        const cur = selHair.value;
        selHair.innerHTML = '<option value="">-- Careca --</option>';
        window.gameData.equipments.filter(e => e.type === 'hair').forEach(h => {
            if (!_equipAllowedForGender(h, gender)) return;
            selHair.innerHTML += `<option value="${h.id}">${h.name}</option>`;
        });
        if (cur) selHair.value = cur;
    }
}

/** Verifica se um equipamento é permitido para o gênero do jogador */
function _equipAllowedForGender(equip, gender) {
    const g = equip.gender || 'both';
    if (g === 'both') return true;
    return g === gender;
}

/** Retorna o src correto da imagem baseado no gênero e side */
window.getEquipImage = function (equip, side, gender) {
    if (!equip) return null;
    const g = gender || window.playerGender || 'male';
    if (g === 'female') {
        const femImg = side === 'f' ? equip.img_front_f : equip.img_back_f;
        if (femImg) return femImg;
    }
    return side === 'f' ? equip.img_front : equip.img_back;
};

/** Retorna imagem do corpo baseada no gênero */
window.getBodyImage = function (body, side, gender) {
    if (!body) return null;
    const g = gender || window.playerGender || 'male';
    if (g === 'female') {
        const femImg = side === 'f' ? body.img_front_f : body.img_back_f;
        if (femImg) return femImg;
    }
    return side === 'f' ? body.img_front : body.img_back;
};

function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    newGameGender = 'male';
    currentSkinColor = "#ffffff";
    newGameStats = { 'for': 1, 'int': 1, 'des': 1, 'car': 1, 'res': 1 };

    // Reset gender buttons
    const btnM = document.getElementById('ng-btn-male');
    const btnF = document.getElementById('ng-btn-female');
    if (btnM) btnM.classList.add('active');
    if (btnF) btnF.classList.remove('active');
    const badge = document.getElementById('ng-gender-badge');
    if (badge) badge.innerHTML = '♂ Masculino';

    _populateNewGameSelects();

    // Cores de pele
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
        btn.style = `width:30px;height:30px;background:${c.code};border-radius:50%;border:2px solid ${c.code === '#ffffff' ? '#e67e22' : '#333'};cursor:pointer;`;
        btn.title = c.name;
        btn.onclick = () => {
            currentSkinColor = c.code;
            Array.from(colorContainer.children).forEach(ch => ch.style.borderColor = '#333');
            btn.style.borderColor = '#e67e22';
            updateNewGamePreview();
        };
        colorContainer.appendChild(btn);
    });

    renderNewGameStats();
    document.getElementById('ng-name').value = '';
    updateNewGamePreview();
}

window.updateNewGamePreview = async function () {
    const bodyId = document.getElementById('ng-body')?.value;
    const faceId = document.getElementById('ng-face')?.value;
    const hairId = document.getElementById('ng-hair')?.value;
    const cF = document.getElementById('ng-prev-front');
    const cB = document.getElementById('ng-prev-back');
    if (!cF || !cB) return;

    cF.innerHTML = ''; cB.innerHTML = '';

    if (bodyId) {
        const fakeEq = { base: bodyId, skin_color: currentSkinColor };
        if (faceId) fakeEq.face = faceId;
        if (hairId) fakeEq.hair = hairId;
        const fakeChar = { race: 'humano', equipment_data: fakeEq, _gender: newGameGender };

        await buildBattleCharacter(fakeChar, 'f', null, 'ng-prev-front');
        await buildBattleCharacter(fakeChar, 'b', null, 'ng-prev-back');
    }

    // --- CÁLCULO E RENDER DOS STATUS ---
    const statsContainer = document.getElementById('ng-stats-preview');
    if (statsContainer && typeof window.calcStatsLocal === 'function') {
        const finalStats = window.calcStatsLocal(newGameStats, {}, {});
        statsContainer.innerHTML = '';
        for (let k in finalStats.computed) {
            let name = window.STAT_MAP.derived[k] || k;
            let val = finalStats.computed[k];
            // Formata taxa crítica para porcentagem
            if (k.includes('crit')) val = val.toFixed(1) + '%';
            else val = val.toFixed(0);

            statsContainer.innerHTML += `
                <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#bdc3c7;">
                    <span>${name}</span>
                    <strong style="color:#2ecc71;">${val}</strong>
                </div>`;
        }
    }
};


function closeNewGameModal() {
    document.getElementById('new-game-modal').style.display = 'none';
}

function renderNewGameStats() {
    const grid = document.getElementById('ng-stats-grid');
    if (!grid) return;
    let spent = Object.values(newGameStats).reduce((a, b) => a + b, 0);
    document.getElementById('ng-pts-left').innerText = MAX_POINTS - spent;
    grid.innerHTML = '';
    Object.keys(window.STAT_MAP.base).forEach(key => {
        grid.innerHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;color:#fff;background:#1a252f;padding:8px;border-radius:5px;">
            <span>${window.STAT_MAP.base[key]}</span>
            <div style="display:flex;align-items:center;gap:8px;">
                <button onclick="changeNewGameStat('${key}',-1)" style="width:28px;height:28px;padding:0;background:#c0392b;border:none;color:#fff;cursor:pointer;font-weight:bold;border-radius:50%;">-</button>
                <span style="display:inline-block;width:24px;text-align:center;font-weight:bold;font-size:1.1em;">${newGameStats[key]}</span>
                <button onclick="changeNewGameStat('${key}',1)" style="width:28px;height:28px;padding:0;background:#27ae60;border:none;color:#fff;cursor:pointer;font-weight:bold;border-radius:50%;">+</button>
            </div>
        </div>`;
    });
}

window.changeNewGameStat = function (key, val) {
    let spent = Object.values(newGameStats).reduce((a, b) => a + b, 0);
    if (val > 0 && (MAX_POINTS - spent) <= 0) return;
    if (val < 0 && newGameStats[key] <= 1) return;
    newGameStats[key] += val;
    renderNewGameStats();
    if (typeof window.updateNewGamePreview === 'function') window.updateNewGamePreview();
};

async function createNewGame() {
    const name = document.getElementById('ng-name').value;
    const bodyId = document.getElementById('ng-body')?.value;
    const faceId = document.getElementById('ng-face')?.value;
    const hairId = document.getElementById('ng-hair')?.value;
    const numGuilds = document.getElementById('ng-gen-guilds').value;
    const numNpcs = document.getElementById('ng-gen-npcs').value;

    if (!name || !bodyId) return window.showToast("Preencha todos os campos obrigatórios!", "error");

    document.getElementById('ng-btn-create').innerText = "Gerando Mundo...";
    document.getElementById('ng-btn-create').disabled = true;

    const res = await window.pywebview.api.create_save(
        name, bodyId, faceId || null, hairId || null,
        currentSkinColor, newGameStats, newGameGender,
        numGuilds, numNpcs
    );

    document.getElementById('ng-btn-create').innerText = "Entrar no Mundo!";
    document.getElementById('ng-btn-create').disabled = false;

    if (res.status === 'success') {
        window.showToast("Mundo e Herói criados!", "success");
        closeNewGameModal();
        loadGameSession(res.save);
    } else {
        window.showToast(res.message, "error");
    }
}

async function deleteSave(id) {
    if (confirm("Apagar save?")) {
        await window.pywebview.api.delete_entity('saves', id);
        window.showToast("Save excluído.", "success");
        loadMenuSaves();
    }
}

async function loadGameSession(save) {
    window.activeSaveId = save.id;
    window.playerGold = save.gold;
    window.playerDays = save.days_passed || 1;
    window.playerGender = save.gender || 'male';

    try { window.playerInventory = JSON.parse(save.inventory_data); }
    catch (e) { window.playerInventory = { equipments: [], consumables: {} }; }
    try { window.playerStatExp = JSON.parse(save.stat_exp); }
    catch (e) { window.playerStatExp = { 'for': 0, 'int': 0, 'des': 0, 'car': 0, 'res': 0 }; }
    try { window.playerAttacks = JSON.parse(save.attacks || '[1]'); }
    catch (e) { window.playerAttacks = [1]; }
    try { window.playerHotbar = JSON.parse(save.hotbar_data || '[1,null,null,null,null,null,null,null,null,null]'); }
    catch (e) { window.playerHotbar = [1, null, null, null, null, null, null, null, null, null]; }
    try { window.attackExp = JSON.parse(save.attack_exp || '{"1":{"xp":0,"level":1}}'); }
    catch (e) { window.attackExp = { "1": { xp: 0, level: 1 } }; }

    try { window._hiredAllies = JSON.parse(save.hired_allies || '[]'); } catch (e) { window._hiredAllies = []; }
    try { window._party = JSON.parse(save.party_data || '[]'); } catch (e) { window._party = []; }
    try { window._repMap = JSON.parse(save.guild_reputation || '{}'); } catch (e) { window._repMap = {}; }
    try { window._activeQuests = JSON.parse(save.active_quests || '[]'); } catch (e) { window._activeQuests = []; }
    try { window._completedQuests = JSON.parse(save.completed_quests || '[]'); } catch (e) { window._completedQuests = []; }

    window.currentWorld = {
        guilds: JSON.parse(save.world_guilds || '[]'),
        members: JSON.parse(save.world_members || '[]'),
        quests: JSON.parse(save.world_quests || '[]')
    };

    window._dungeonMaxFloor = save.dungeon_max_floor || 1;
    window._dungeonCurrentFloor = save.dungeon_current_floor || 1;
    window._currentSave = save;

    window.activePlayer = {
        id: save.id, name: save.name, race: 'humano',
        equipment_data: JSON.parse(save.equipment_data),
        base_stats: JSON.parse(save.base_stats),
        gender: save.gender || 'male',
        _save: save,
    };

    await window.refreshPlayerStats();

    window.playerHP = (save.current_hp === null || isNaN(save.current_hp) || save.current_hp === 9999) ? window.playerFullStats.computed.hp : save.current_hp;
    window.playerMana = (save.current_mana === null || isNaN(save.current_mana) || save.current_mana === 9999) ? window.playerFullStats.computed.mana : save.current_mana;
    window.playerStamina = (save.current_stamina === null || isNaN(save.current_stamina) || save.current_stamina === 9999) ? window.playerFullStats.computed.stamina : save.current_stamina;

    window.updateHUD();

    const gameBtn = document.getElementById('btn-tab-game');
    if (gameBtn) {
        gameBtn.style.display = 'block';
        if (typeof showTab === "function") showTab('game-tab', gameBtn);
    }

    if (typeof window.saveGameState === "function") await window.saveGameState();
    if (typeof backToCity === "function") backToCity();
}
