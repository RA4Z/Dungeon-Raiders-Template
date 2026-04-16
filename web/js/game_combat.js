// Renderizador Oficial do Boneco
function buildBattleCharacter(characterData, side, imgId, layersId) {
    const imgEl = document.getElementById(imgId);
    const layersEl = document.getElementById(layersId);
    
    if (!characterData) return;

    if (characterData.race === 'humano') {
        if(imgEl) imgEl.style.display = 'none';
        if(layersEl) {
            layersEl.style.display = 'block';
            layersEl.innerHTML = '';
        }
        
        let eqDataMap = typeof characterData.equipment_data === 'string' 
            ? JSON.parse(characterData.equipment_data) 
            : characterData.equipment_data;
        
        window.EQUIP_SLOTS.forEach((slot, index) => {
            const itemId = eqDataMap[slot];
            if (itemId) {
                let itemData = slot === 'base' ? window.gameData.bodies.find(b => b.id == itemId) : window.gameData.equipments.find(e => e.id == itemId);
                if (itemData && layersEl) {
                    const img = side === 'f' ? itemData.img_front : itemData.img_back;
                    if(img) layersEl.innerHTML += `<img src="${img}" style="z-index: ${index};">`;
                }
            }
        });
    } else {
        if(layersEl) layersEl.style.display = 'none';
        if(imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}

async function enterDungeon() {
    setView('combat-screen');
    document.getElementById('combat-dialogue').innerText = "Você adentra a caverna... procurando um inimigo.";
    document.getElementById('attack-btn').disabled = true;
    document.getElementById('flee-btn').disabled = true;

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    
    await spawnRandomEnemy();
}

// Separado em função para permitir repetição infinita do Loop
async function spawnRandomEnemy() {
    const enemyData = await window.pywebview.api.get_random_enemy(window.activePlayer.id);
    
    setTimeout(() => {
        if (!enemyData) {
            document.getElementById('combat-dialogue').innerText = "Não há monstros cadastrados na base de dados!";
            document.getElementById('flee-btn').disabled = false;
            return;
        }

        window.currentEnemy = enemyData;
        window.enemyHP = window.currentEnemy.hp;
        document.getElementById('enemy-name').innerText = window.currentEnemy.name;
        
        buildBattleCharacter(window.currentEnemy, 'f', 'enemy-image', 'enemy-layers');
        document.getElementById('enemy-image').style.display = 'block'; // força show
        
        document.getElementById('combat-dialogue').innerText = `Um(a) ${window.currentEnemy.name} pulou das sombras!`;
        updateBattleUI();
        
        window.isTurnBusy = false;
        document.getElementById('attack-btn').disabled = false;
        document.getElementById('flee-btn').disabled = false;
    }, 800);
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
        
        // Sincroniza HP caso apanhe
        await window.pywebview.api.sync_player_state(
            window.activePlayer.id, window.playerHP, 
            JSON.stringify(window.playerInventory), JSON.stringify(window.activePlayer.equipment_data)
        );

        updateBattleUI();
        document.getElementById('combat-dialogue').innerText = res.msg;

        setTimeout(() => {
            pContainer.classList.remove('enemy-hit');
            if (window.playerHP <= 0) {
                document.getElementById('combat-dialogue').innerText = "Você morreu e perdeu sua mochila de ouro...";
                setTimeout(() => { window.playerHP = window.activePlayer.hp; backToCity(); }, 3000);
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

    // IMPORTANTE: Agora enviamos o ID do SAVE ATIVO para o Python
    const lootRes = await window.pywebview.api.generate_loot(window.currentEnemy.id, window.activeSaveId);
    
    window.playerInventory = lootRes.new_inventory;
    window.playerGold = lootRes.new_gold;

    setTimeout(() => {
        document.getElementById('loot-list').innerHTML = lootRes.loot_list.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
}

// LOOP DUNGEON INFINITO
function continueDungeon() {
    document.getElementById('loot-modal').style.display = 'none';
    document.getElementById('enemy-layers').innerHTML = '';
    document.getElementById('enemy-image').style.display = 'none';
    
    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    document.getElementById('attack-btn').disabled = true;
    document.getElementById('flee-btn').disabled = true;
    
    spawnRandomEnemy(); // Puxa outro inimigo!
}

function fleeBattle() {
    document.getElementById('combat-dialogue').innerText = "Você fugiu apavorado!";
    setTimeout(() => { backToCity(); }, 1500);
}

function closeLootAndReturn() {
    document.getElementById('loot-modal').style.display = 'none';
    backToCity();
}

window.buildBattleCharacter = async function(characterData, side, imgId, layersId) {
    const imgEl = imgId ? document.getElementById(imgId) : null;
    const layersEl = layersId ? document.getElementById(layersId) : null;
    
    if (!characterData) return;

    if (characterData.race === 'humano') {
        if(imgEl) imgEl.style.display = 'none';
        if(layersEl) {
            layersEl.style.display = 'block';
            layersEl.innerHTML = ''; // Limpa antes de re-desenhar
        }
        
        let eqDataMap = typeof characterData.equipment_data === 'string' 
            ? JSON.parse(characterData.equipment_data) : characterData.equipment_data;
        
        let skinColor = eqDataMap.skin_color || "#ffffff";
        let finalHtml = ""; // Acumula o HTML para não piscar a tela

        // Precisa usar for-of porque forEach não lida bem com await interno
        for (let index = 0; index < window.EQUIP_SLOTS.length; index++) {
            const slot = window.EQUIP_SLOTS[index];
            const itemId = eqDataMap[slot];
            
            if (itemId) {
                let itemData = slot === 'base' ? window.gameData.bodies.find(b => b.id == itemId) : window.gameData.equipments.find(e => e.id == itemId);
                
                if (itemData) {
                    let imgSrc = side === 'f' ? itemData.img_front : itemData.img_back;
                    
                    if (imgSrc) {
                        // Aplica o Shader APENAS no Corpo e Rosto
                        if (slot === 'base' || slot === 'face') {
                            imgSrc = await window.applyShaderTint(imgSrc, skinColor);
                        }
                        
                        finalHtml += `<img src="${imgSrc}" style="z-index: ${index};">`;
                    }
                }
            }
        }
        
        if (layersEl) layersEl.innerHTML = finalHtml;

    } else {
        // MONSTRO SIMPLES
        if(layersEl) layersEl.style.display = 'none';
        if(imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}

