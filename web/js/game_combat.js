// Renderizador Oficial do Boneco
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

    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    await spawnRandomEnemy();
}

// Separado em função para permitir repetição infinita do Loop
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
        // Segurança contra os NULL do passado
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

async function startTurnSequence(atkType) {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;

    toggleCombatButtons(true);

    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, window.enemyFullStats, atkType);
    window.enemyHP = Math.max(0, window.enemyHP - res.damage);
    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Você usou ${atkType === 'phys' ? 'Ataque Físico' : 'Magia'}: ${res.msg}`;

    setTimeout(async () => {
        if (window.enemyHP <= 0) {
            winBattle();
        } else {
            const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, 'phys');
            window.playerHP = Math.max(0, window.playerHP - resE.damage);
            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} revidou: ${resE.msg}`;

            // --- MORTE DO PLAYER ---
            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;

                await window.saveGameState(); // USA A FUNÇÃO GLOBAL CORRIGIDA

                setTimeout(() => {
                    window.playerHP = window.playerFullStats.computed.hp;
                    backToCity();
                }, 3500);
            } else {
                // --- PLAYER SOBREVIVEU AO REVIDE ---
                await window.saveGameState(); // SALVA O HP ATUALIZADO
                window.isTurnBusy = false;
                toggleCombatButtons(false);
            }
        }
    }, 1000);
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

    // CÁLCULO DE FUGA BASEADO EM DESTREZA
    let pDes = window.playerFullStats.base.des;
    let eDes = window.enemyFullStats.base.des;

    // Base de 50%. A cada 1 ponto de diferença de destreza, muda 5%
    let fleeChance = 50 + ((pDes - eDes) * 5);

    // Limita a chance entre 10% (mínimo) e 90% (máximo)
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

        // Se falhar na fuga, o inimigo ganha um turno grátis!
        setTimeout(async () => {
            const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, 'phys');
            window.playerHP = Math.max(0, window.playerHP - resE.damage);
            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} aproveitou a brecha: ${resE.msg}`;

            await window.pywebview.api.sync_player_state(
                window.activeSaveId, window.playerHP, window.playerGold,
                JSON.stringify(window.playerInventory), JSON.stringify(window.activePlayer.equipment_data)
            );

            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você morreu tentando fugir. Perdeu ${ouroPerdido} de Ouro!`;

                await window.saveGameState(); // USA A FUNÇÃO GLOBAL CORRIGIDA

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
        if (layersEl) layersEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}

function toggleCombatButtons(state) {
    const btn1 = document.getElementById('attack-phys-btn');
    const btn2 = document.getElementById('attack-mag-btn');
    const btn3 = document.getElementById('flee-btn');

    if (btn1) btn1.disabled = state;
    if (btn2) btn2.disabled = state;
    if (btn3) btn3.disabled = state;
}
