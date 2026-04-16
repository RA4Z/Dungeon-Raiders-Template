// web/js/game_combat.js

function buildBattleCharacter(characterData, side, imgId, layersId) {
    const imgEl = document.getElementById(imgId);
    const layersEl = document.getElementById(layersId);

    if (!characterData) return;

    if (characterData.race === 'humano') {
        if (imgEl) imgEl.style.display = 'none';
        if (layersEl) {
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
                    if (img) layersEl.innerHTML += `<img src="${img}" style="z-index: ${index};">`;
                }
            }
        });
    } else {
        if (layersEl) layersEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}

async function enterDungeon() {
    setView('combat-screen');
    document.getElementById('combat-dialogue').innerText = "Você adentra a caverna... procurando um inimigo.";

    // Renderiza a Interface de Magias Ativas que o Jogador possuí
    renderCombatActions();

    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    await spawnRandomEnemy();
}

async function spawnRandomEnemy() {
    const enemyData = await window.pywebview.api.get_random_enemy();
    if (!enemyData) return;

    window.currentEnemy = enemyData;
    await window.refreshEnemyStats(enemyData.id);

    window.enemyHP = window.enemyFullStats.computed.hp;
    document.getElementById('enemy-name').innerText = window.currentEnemy.name;

    await buildBattleCharacter(window.currentEnemy, 'f', 'enemy-image', 'enemy-layers');
    if (document.getElementById('enemy-image')) document.getElementById('enemy-image').style.display = 'block';

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Um ${window.currentEnemy.name} apareceu!`;
    window.isTurnBusy = false;

    toggleCombatButtons(false);
}

function updateBattleUI() {
    if (window.playerFullStats && window.playerFullStats.computed) {
        const pMax = window.playerFullStats.computed.hp;
        let pHP = (isNaN(window.playerHP) || window.playerHP === null) ? pMax : window.playerHP;
        document.getElementById('player-hp-text').innerText = `HP: ${pHP}/${pMax}`;
        document.getElementById('player-hp-fill').style.width = `${Math.max(0, (pHP / pMax) * 100)}%`;
    }

    if (window.currentEnemy && window.enemyFullStats && window.enemyFullStats.computed) {
        const eMax = window.enemyFullStats.computed.hp;
        let eHP = (isNaN(window.enemyHP) || window.enemyHP === null) ? 0 : window.enemyHP;
        document.getElementById('enemy-hp-text').innerText = `HP: ${eHP}/${eMax}`;
        document.getElementById('enemy-hp-fill').style.width = `${Math.max(0, (eHP / eMax) * 100)}%`;
    }
}

// NOVO: Gerar Lista de Magias Visual no Combate
function renderCombatActions() {
    const container = document.getElementById('combat-skills-list');
    if (!container) return;
    container.innerHTML = '';
    
    let attacks = [1]; // ID fallback
    try { attacks = typeof window.playerAttacks === "string" ? JSON.parse(window.playerAttacks) : window.playerAttacks; } catch(e){}

    attacks.forEach(atkId => {
        const atk = window.gameData.attacks.find(a => a.id == atkId);
        if(atk) {
            const btn = document.createElement('button');
            btn.className = `skill-btn ${atk.atk_type}`; // phys ou mag p/ CSS
            btn.innerText = atk.name;
            btn.onclick = () => startTurnSequence(atk.id);
            container.appendChild(btn);
        }
    });
}

function toggleCombatButtons(state) {
    document.querySelectorAll('.skill-btn').forEach(btn => btn.disabled = state);
    const btnFlee = document.getElementById('flee-btn');
    if (btnFlee) btnFlee.disabled = state;
}

// AGORA RECEBE O ID DO ATAQUE DIRETO DO BANCO DE DADOS
async function startTurnSequence(attackId) {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;

    toggleCombatButtons(true);

    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, window.enemyFullStats, attackId);
    window.enemyHP = Math.max(0, window.enemyHP - res.damage);
    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = res.msg;

    setTimeout(async () => {
        if (window.enemyHP <= 0) {
            winBattle();
        } else {
            // TURNO DO INIMIGO: Seleciona um ataque aleatório da pool dele
            let enemyAtkIds = [1];
            try { 
                enemyAtkIds = typeof window.currentEnemy.attacks === "string" ? JSON.parse(window.currentEnemy.attacks) : window.currentEnemy.attacks; 
            } catch(e){}
            if (!enemyAtkIds || enemyAtkIds.length === 0) enemyAtkIds =[1];
            let randomAtkId = enemyAtkIds[Math.floor(Math.random() * enemyAtkIds.length)];

            const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, randomAtkId);
            window.playerHP = Math.max(0, window.playerHP - resE.damage);
            
            // Animação e Sombras
            const pContainer = document.getElementById('player-container');
            if(pContainer) {
                pContainer.classList.add('enemy-hit');
                setTimeout(() => pContainer.classList.remove('enemy-hit'), 200);
            }

            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} revidou e ${resE.msg}`;

            // --- MORTE DO PLAYER ---
            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;

                await window.saveGameState(); 

                setTimeout(() => {
                    window.playerHP = window.playerFullStats.computed.hp;
                    backToCity();
                }, 3500);
            } else {
                await window.saveGameState(); 
                window.isTurnBusy = false;
                toggleCombatButtons(false);
            }
        }
    }, 1200);
}

async function winBattle() {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loots...";
    document.getElementById('enemy-layers').innerHTML = '';
    document.getElementById('enemy-image').style.display = 'none';

    const lootRes = await window.pywebview.api.generate_loot(window.currentEnemy.id, window.activeSaveId);

    window.playerInventory = lootRes.new_inventory;
    window.playerGold = lootRes.new_gold;

    setTimeout(() => {
        document.getElementById('loot-list').innerHTML = lootRes.loot_list.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
}

function continueDungeon() {
    document.getElementById('loot-modal').style.display = 'none';
    if (document.getElementById('enemy-layers')) document.getElementById('enemy-layers').innerHTML = '';
    if (document.getElementById('enemy-image')) document.getElementById('enemy-image').style.display = 'none';

    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    toggleCombatButtons(true);

    spawnRandomEnemy();
}

async function fleeBattle() {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    toggleCombatButtons(true);

    let pDes = window.playerFullStats.base.des;
    let eDes = window.enemyFullStats.base.des;

    let fleeChance = 50 + ((pDes - eDes) * 5);
    fleeChance = Math.max(10, Math.min(90, fleeChance));
    let roll = Math.random() * 100;

    if (roll <= fleeChance) {
        document.getElementById('combat-dialogue').innerText = "Você conseguiu despistar o inimigo e fugir!";
        setTimeout(() => {
            window.isTurnBusy = false;
            backToCity();
        }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "O inimigo é muito rápido e bloqueou sua rota de fuga!";

        // Se falhar, o inimigo bate
        setTimeout(async () => {
            let enemyAtkIds = [1];
            try { enemyAtkIds = JSON.parse(window.currentEnemy.attacks || '[1]'); } catch(e){}
            let randomAtkId = enemyAtkIds[Math.floor(Math.random() * enemyAtkIds.length)];

            const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, randomAtkId);
            window.playerHP = Math.max(0, window.playerHP - resE.damage);
            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} atacou sua retaguarda e ${resE.msg}`;

            await window.saveGameState();

            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você morreu tentando fugir. Perdeu ${ouroPerdido} de Ouro!`;

                await window.saveGameState(); 

                setTimeout(() => {
                    window.playerHP = window.playerFullStats.computed.hp;
                    backToCity();
                }, 3500);
            } else {
                window.isTurnBusy = false;
                toggleCombatButtons(false);
            }
        }, 1500);
    }
}

function closeLootAndReturn() {
    document.getElementById('loot-modal').style.display = 'none';
    backToCity();
}

window.buildBattleCharacter = async function (characterData, side, imgId, layersId) {
    const imgEl = imgId ? document.getElementById(imgId) : null;
    const layersEl = layersId ? document.getElementById(layersId) : null;

    if (!characterData) return;

    if (characterData.race === 'humano') {
        if (imgEl) imgEl.style.display = 'none';
        if (layersEl) {
            layersEl.style.display = 'block';
            layersEl.innerHTML = ''; 
        }

        let eqDataMap = typeof characterData.equipment_data === 'string'
            ? JSON.parse(characterData.equipment_data) : characterData.equipment_data;

        let skinColor = eqDataMap.skin_color || "#ffffff";
        let finalHtml = ""; 

        for (let index = 0; index < window.EQUIP_SLOTS.length; index++) {
            const slot = window.EQUIP_SLOTS[index];
            const itemId = eqDataMap[slot];

            if (itemId) {
                let itemData = slot === 'base' ? window.gameData.bodies.find(b => b.id == itemId) : window.gameData.equipments.find(e => e.id == itemId);

                if (itemData) {
                    let imgSrc = side === 'f' ? itemData.img_front : itemData.img_back;

                    if (imgSrc) {
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
        if (layersEl) layersEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}