// Renderizador oficial da Paper Doll em Batalha
function buildBattleCharacter(characterData, side, imgId, layersId) {
    const imgEl = document.getElementById(imgId);
    const layersEl = document.getElementById(layersId);
    
    if (!characterData) return;

    if (characterData.race === 'humano') {
        imgEl.style.display = 'none';
        layersEl.style.display = 'block';
        layersEl.innerHTML = '';
        
        let eqDataMap = typeof characterData.equipment_data === 'string' 
            ? JSON.parse(characterData.equipment_data) 
            : characterData.equipment_data;
        
        // Segue estritamente a ordem do window.EQUIP_SLOTS
        window.EQUIP_SLOTS.forEach((slot, index) => {
            const itemId = eqDataMap[slot];
            if (itemId) {
                let itemData = slot === 'base' 
                    ? window.gameData.bodies.find(b => b.id == itemId)
                    : window.gameData.equipments.find(e => e.id == itemId);

                if (itemData) {
                    const img = side === 'f' ? itemData.img_front : itemData.img_back;
                    if(img) layersEl.innerHTML += `<img src="${img}" style="z-index: ${index};">`;
                }
            }
        });
    } else {
        // Monstro Simples
        layersEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
    }
}

async function enterDungeon() {
    setView('combat-screen');
    document.getElementById('combat-dialogue').innerText = "Adentrando as sombras... Buscando inimigo!";
    document.getElementById('attack-btn').disabled = true;
    document.getElementById('flee-btn').disabled = true;

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    
    const enemyData = await window.pywebview.api.get_random_enemy(window.activePlayer.id);
    
    setTimeout(() => {
        if (!enemyData) {
            document.getElementById('combat-dialogue').innerText = "As cavernas estão vazias. Volte depois.";
            document.getElementById('flee-btn').disabled = false;
            return;
        }

        window.currentEnemy = enemyData;
        window.enemyHP = window.currentEnemy.hp;
        document.getElementById('enemy-name').innerText = window.currentEnemy.name;
        
        buildBattleCharacter(window.currentEnemy, 'f', 'enemy-image', 'enemy-layers');
        
        document.getElementById('combat-dialogue').innerText = `Um selvagem ${window.currentEnemy.name} atacou!`;
        updateBattleUI();
        
        window.isTurnBusy = false;
        document.getElementById('attack-btn').disabled = false;
        document.getElementById('flee-btn').disabled = false;
    }, 1000);
}

function updateBattleUI() {
    if (window.activePlayer) {
        document.getElementById('player-hp-text').innerText = `HP: ${window.playerHP}/${window.activePlayer.hp}`;
        document.getElementById('player-hp-fill').style.width = `${Math.max(0, (window.playerHP / window.activePlayer.hp) * 100)}%`;
    }
    if (window.currentEnemy) {
        document.getElementById('enemy-hp-text').innerText = `HP: ${window.enemyHP}/${window.currentEnemy.hp}`;
        document.getElementById('enemy-hp-fill').style.width = `${Math.max(0, (window.enemyHP / window.currentEnemy.hp) * 100)}%`;
    }
}

async function startTurnSequence() {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    document.getElementById('attack-btn').disabled = true;
    document.getElementById('flee-btn').disabled = true;

    const pContainer = document.getElementById('player-container');
    pContainer.classList.add('player-attack');
    
    setTimeout(async () => {
        const eContainer = document.getElementById('enemy-container');
        eContainer.classList.add('enemy-hit');
        
        const res = await window.pywebview.api.process_battle_turn(
            window.activePlayer.attack, window.currentEnemy.attack, window.playerHP, window.enemyHP, 'player'
        );
        window.enemyHP = res.new_hp;
        updateBattleUI();
        document.getElementById('combat-dialogue').innerText = res.msg;

        setTimeout(() => {
            pContainer.classList.remove('player-attack');
            eContainer.classList.remove('enemy-hit');

            if (window.enemyHP <= 0) winBattle();
            else enemyReviveTurn();
        }, 500);
    }, 200);
}

async function enemyReviveTurn() {
    setTimeout(async () => {
        document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} ataca!`;
        const pContainer = document.getElementById('player-container');
        pContainer.classList.add('enemy-hit');

        const res = await window.pywebview.api.process_battle_turn(
            window.activePlayer.attack, window.currentEnemy.attack, window.playerHP, window.enemyHP, 'enemy'
        );
        window.playerHP = res.new_hp;
        updateBattleUI();
        document.getElementById('combat-dialogue').innerText = res.msg;

        setTimeout(() => {
            pContainer.classList.remove('enemy-hit');
            if (window.playerHP <= 0) {
                document.getElementById('combat-dialogue').innerText = "Você desmaiou e foi arrastado de volta para casa...";
                setTimeout(() => { window.playerHP = 1; backToCity(); }, 3000);
            } else {
                window.isTurnBusy = false;
                document.getElementById('attack-btn').disabled = false;
                document.getElementById('flee-btn').disabled = false;
            }
        }, 500);
    }, 1000);
}

async function winBattle() {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loots...";
    document.getElementById('enemy-layers').innerHTML = '';
    document.getElementById('enemy-image').style.display = 'none';

    const lootData = await window.pywebview.api.generate_loot();
    
    setTimeout(() => {
        document.getElementById('loot-list').innerHTML = lootData.loot_list.map(l => `<li>${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
}

function fleeBattle() {
    document.getElementById('combat-dialogue').innerText = "Você correu feito um covarde!";
    setTimeout(() => { backToCity(); }, 1500);
}

function closeLootAndReturn() {
    document.getElementById('loot-modal').style.display = 'none';
    backToCity();
}