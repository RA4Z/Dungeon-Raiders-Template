// frontend/src/js/main_menu.js — substituição completa
let currentSkinColor = "#ffffff";
let newGameStats = { 'for':1,'int':1,'des':1,'car':1,'res':1 };
const MAX_POINTS = 15;

async function loadMenuSaves() {
    const saves = await window.pywebview.api.get_saves();
    const container = document.getElementById('saves-list-container');
    if (!container) return;
    container.innerHTML = saves.map(save => `
        <div class="save-card" onclick="loadGameSession(${JSON.stringify(save).replace(/"/g, '&quot;')})">
            <h3>${save.name}</h3>
            <div class="save-stats">🪙 ${save.gold} | Dia: ${save.days_passed}</div>
            <button class="save-del-btn" onclick="event.stopPropagation(); deleteSave(${save.id})">Apagar</button>
        </div>`).join('');
}

function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('ng-name').value = '';
    const selBody = document.getElementById('ng-body');
    selBody.innerHTML = '<option value="">-- Corpo Base --</option>';
    window.gameData.bodies.forEach(b => {
        if (b.is_playable === 1) selBody.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });
    const selFace = document.getElementById('ng-face');
    selFace.innerHTML = '<option value="">-- Sem Rosto --</option>';
    window.gameData.equipments.filter(e => e.type==='face').forEach(f => {
        selFace.innerHTML += `<option value="${f.id}">${f.name}</option>`;
    });
    const selHair = document.getElementById('ng-hair');
    selHair.innerHTML = '<option value="">-- Careca --</option>';
    window.gameData.equipments.filter(e => e.type==='hair').forEach(h => {
        selHair.innerHTML += `<option value="${h.id}">${h.name}</option>`;
    });
    const colors = [
        {code:'#ffffff',name:'Original'},{code:'#ffdfc4',name:'Pálida'},
        {code:'#d4a373',name:'Morena'},{code:'#8d5524',name:'Escura'},
        {code:'#4b3621',name:'Muito Escura'},{code:'#7cb342',name:'Orc'},
        {code:'#e53935',name:'Demônio'},{code:'#5e35b1',name:'Elfo Negro'}
    ];
    const colorContainer = document.getElementById('ng-colors');
    colorContainer.innerHTML = '';
    colors.forEach(c => {
        const btn = document.createElement('div');
        btn.style = `width:30px;height:30px;background:${c.code};border-radius:50%;border:2px solid ${c.code==='#ffffff'?'#e67e22':'#333'};cursor:pointer;`;
        btn.title  = c.name;
        btn.onclick = () => {
            currentSkinColor = c.code;
            Array.from(colorContainer.children).forEach(child => child.style.borderColor='#333');
            btn.style.borderColor = '#e67e22';
            updateNewGamePreview();
        };
        colorContainer.appendChild(btn);
    });
    newGameStats = {'for':1,'int':1,'des':1,'car':1,'res':1};
    renderNewGameStats();
    currentSkinColor = "#ffffff";
    updateNewGamePreview();
}

async function updateNewGamePreview() {
    const bodyId = document.getElementById('ng-body').value;
    const faceId = document.getElementById('ng-face').value;
    const hairId = document.getElementById('ng-hair').value;
    const cF = document.getElementById('ng-prev-front');
    const cB = document.getElementById('ng-prev-back');
    cF.innerHTML=''; cB.innerHTML='';
    if (!bodyId) return;
    const fakeEq  = { base:bodyId, skin_color:currentSkinColor };
    if (faceId) fakeEq.face = faceId;
    if (hairId) fakeEq.hair = hairId;
    const fakeChar = { race:'humano', equipment_data:fakeEq };
    await window.buildBattleCharacter(fakeChar,'f',null,'ng-prev-front');
    await window.buildBattleCharacter(fakeChar,'b',null,'ng-prev-back');
}

function closeNewGameModal() { document.getElementById('new-game-modal').style.display='none'; }

function renderNewGameStats() {
    const grid = document.getElementById('ng-stats-grid');
    if (!grid) return;
    let spent = Object.values(newGameStats).reduce((a,b)=>a+b,0);
    document.getElementById('ng-pts-left').innerText = MAX_POINTS - spent;
    grid.innerHTML = '';
    Object.keys(window.STAT_MAP.base).forEach(key => {
        grid.innerHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;color:#fff;">
            <span>${window.STAT_MAP.base[key]}</span>
            <div>
                <button onclick="changeNewGameStat('${key}',-1)" style="padding:2px 8px;background:#c0392b;border:none;color:#fff;cursor:pointer;font-weight:bold;">-</button>
                <span style="display:inline-block;width:20px;text-align:center;font-weight:bold;">${newGameStats[key]}</span>
                <button onclick="changeNewGameStat('${key}',1)" style="padding:2px 8px;background:#27ae60;border:none;color:#fff;cursor:pointer;font-weight:bold;">+</button>
            </div>
        </div>`;
    });
}

window.changeNewGameStat = function(key,val) {
    let spent = Object.values(newGameStats).reduce((a,b)=>a+b,0);
    if (val>0 && (MAX_POINTS-spent) <= 0) return;
    if (val<0 && newGameStats[key] <= 1) return;
    newGameStats[key] += val;
    renderNewGameStats();
};

async function createNewGame() {
    const name = document.getElementById('ng-name').value;
    const bodyId = document.getElementById('ng-body').value;
    if (!name || !bodyId) return window.showToast("Preencha todos os campos!", "error");
    const res = await window.pywebview.api.create_save(name, bodyId, null, null, currentSkinColor, newGameStats);
    if (res.status === 'success') { 
        window.showToast("Herói criado!", "success");
        closeNewGameModal(); 
        loadGameSession(res.save); 
    } else { window.showToast(res.message, "error"); }
}


async function deleteSave(id) {
    if (confirm("Apagar save?")) {
        await window.pywebview.api.delete_entity('saves', id);
        window.showToast("Save excluído.", "success");
        loadMenuSaves();
    }
}

async function loadGameSession(save) {
    window.activeSaveId  = save.id;
    window.playerGold    = save.gold;
    window.playerDays    = save.days_passed || 1;

    try { window.playerInventory  = JSON.parse(save.inventory_data); }
    catch(e) { window.playerInventory = {equipments:[],consumables:{}}; }
    try { window.playerStatExp    = JSON.parse(save.stat_exp); }
    catch(e) { window.playerStatExp = {'for':0,'int':0,'des':0,'car':0,'res':0}; }
    try { window.playerAttacks    = JSON.parse(save.attacks || '[1]'); }
    catch(e) { window.playerAttacks = [1]; }
    try { window.playerHotbar     = JSON.parse(save.hotbar_data || '[1,null,null,null,null,null,null,null,null,null]'); }
    catch(e) { window.playerHotbar = [1,null,null,null,null,null,null,null,null,null]; }
    try { window.attackExp        = JSON.parse(save.attack_exp || '{"1":{"xp":0,"level":1}}'); }
    catch(e) { window.attackExp = {"1":{xp:0,level:1}}; }

    // Novos estados
    try { window._hiredAllies     = JSON.parse(save.hired_allies     || '[]'); }  catch(e) { window._hiredAllies = []; }
    try { window._party           = JSON.parse(save.party_data       || '[]'); }  catch(e) { window._party = []; }
    try { window._repMap          = JSON.parse(save.guild_reputation  || '{}'); } catch(e) { window._repMap = {}; }
    try { window._activeQuests    = JSON.parse(save.active_quests    || '[]'); }  catch(e) { window._activeQuests = []; }
    try { window._completedQuests = JSON.parse(save.completed_quests || '[]'); }  catch(e) { window._completedQuests = []; }
    window._dungeonMaxFloor     = save.dungeon_max_floor     || 1;
    window._dungeonCurrentFloor = save.dungeon_current_floor || 1;
    window._currentSave = save;

    window.activePlayer = {
        id: save.id, name: save.name, race:'humano',
        equipment_data: JSON.parse(save.equipment_data),
        base_stats:     JSON.parse(save.base_stats),
        _save: save,
    };

    await window.refreshPlayerStats();

    window.playerHP      = (save.current_hp      === null || isNaN(save.current_hp)      || save.current_hp      === 9999) ? window.playerFullStats.computed.hp      : save.current_hp;
    window.playerMana    = (save.current_mana    === null || isNaN(save.current_mana)    || save.current_mana    === 9999) ? window.playerFullStats.computed.mana    : save.current_mana;
    window.playerStamina = (save.current_stamina === null || isNaN(save.current_stamina) || save.current_stamina === 9999) ? window.playerFullStats.computed.stamina : save.current_stamina;

    window.updateHUD();

    const gameBtn = document.getElementById('btn-tab-game');
    if (gameBtn) { gameBtn.style.display='block'; if (typeof showTab==="function") showTab('game-tab', gameBtn); }

    if (typeof window.saveGameState === "function") await window.saveGameState();
    if (typeof backToCity === "function") backToCity();
}