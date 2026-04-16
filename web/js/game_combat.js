// web/js/game_combat.js

function buildBattleCharacter(characterData, side, imgId, layersId) {
    const imgEl = document.getElementById(imgId);
    const layersEl = document.getElementById(layersId);
    if (!characterData) return;

    if (characterData.race === 'humano') {
        if (imgEl) imgEl.style.display = 'none';
        if (layersEl) { layersEl.style.display = 'block'; layersEl.innerHTML = ''; }

        let eqDataMap = typeof characterData.equipment_data === 'string' ? JSON.parse(characterData.equipment_data) : characterData.equipment_data;

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
    window.updateHUD();

    renderCombatHotbar();
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

    // Inimigo surge com recursos 100%
    window.enemyHP = window.enemyFullStats.computed.hp;
    window.enemyMana = window.enemyFullStats.computed.mana;
    window.enemyStamina = window.enemyFullStats.computed.stamina;

    document.getElementById('enemy-name').innerText = window.currentEnemy.name;

    await buildBattleCharacter(window.currentEnemy, 'f', 'enemy-image', 'enemy-layers');
    if (document.getElementById('enemy-image')) document.getElementById('enemy-image').style.display = 'block';

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Um ${window.currentEnemy.name} apareceu!`;
    window.isTurnBusy = false;

    toggleCombatButtons(false);
}

// Atualiza todas as barras do HUD do Combate
function updateBattleUI() {
    // ---- PLAYER BARS ----
    if (window.playerFullStats && window.playerFullStats.computed) {
        const c = window.playerFullStats.computed;
        let hp = window.playerHP; let mp = window.playerMana; let sp = window.playerStamina;

        document.getElementById('player-hp-text').innerText = `HP: ${Math.floor(hp)}/${c.hp}`;
        document.getElementById('player-hp-fill').style.width = `${Math.max(0, (hp / c.hp) * 100)}%`;
        
        document.getElementById('player-mp-text').innerText = `MP: ${Math.floor(mp)}/${c.mana}`;
        document.getElementById('player-mp-fill').style.width = `${Math.max(0, (mp / c.mana) * 100)}%`;
        
        document.getElementById('player-sp-text').innerText = `SP: ${Math.floor(sp)}/${c.stamina}`;
        document.getElementById('player-sp-fill').style.width = `${Math.max(0, (sp / c.stamina) * 100)}%`;
    }

    // ---- ENEMY BARS ----
    if (window.currentEnemy && window.enemyFullStats && window.enemyFullStats.computed) {
        const c = window.enemyFullStats.computed;
        let hp = window.enemyHP; let mp = window.enemyMana; let sp = window.enemyStamina;

        document.getElementById('enemy-hp-text').innerText = `HP: ${Math.floor(hp)}/${c.hp}`;
        document.getElementById('enemy-hp-fill').style.width = `${Math.max(0, (hp / c.hp) * 100)}%`;
        
        document.getElementById('enemy-mp-text').innerText = `MP: ${Math.floor(mp)}/${c.mana}`;
        document.getElementById('enemy-mp-fill').style.width = `${Math.max(0, (mp / c.mana) * 100)}%`;
        
        document.getElementById('enemy-sp-text').innerText = `SP: ${Math.floor(sp)}/${c.stamina}`;
        document.getElementById('enemy-sp-fill').style.width = `${Math.max(0, (sp / c.stamina) * 100)}%`;
    }

    // Refresca visualmente os botões (Se o player não tem recursos, o botão apaga)
    if (!window.isTurnBusy) toggleCombatButtons(false);
}

// === SISTEMA DE HOTBAR E DRAG & DROP === //
function renderCombatHotbar() {
    const container = document.getElementById('combat-hotbar');
    if (!container) return;
    container.innerHTML = '';
    
    window.playerHotbar.forEach((atkId, index) => {
        const btn = document.createElement('button');
        
        if (atkId !== null) {
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if(atk) {
                btn.className = `hotbar-slot hb-atk-${atk.atk_type}`;
                btn.dataset.atkId = atkId; // Adicionado para facilitar filtro de disable
                let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
                let cost = atk.cost || 5;
                btn.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level} | ${cost}⚡</div>`;
                btn.onclick = () => startTurnSequence(atk.id);
            } else {
                btn.className = 'hotbar-slot empty';
            }
        } else {
            btn.className = 'hotbar-slot empty';
        }
        
        container.appendChild(btn);
    });
}

function toggleCombatButtons(state) {
    document.querySelectorAll('.hotbar-slot:not(.empty)').forEach(btn => {
        if (state) {
            btn.disabled = true;
        } else {
            const atkId = btn.dataset.atkId;
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if (atk) {
                let cost = atk.cost || 5;
                if (atk.atk_type === 'phys' && window.playerStamina < cost) btn.disabled = true;
                else if (atk.atk_type === 'mag' && window.playerMana < cost) btn.disabled = true;
                else btn.disabled = false;
            }
        }
    });

    const btnFlee = document.getElementById('flee-btn');
    if (btnFlee) btnFlee.disabled = state;
}

// === LÓGICA DE COMBATE COMPLETA (DODGE, XP, MANA/STAMINA) === //
async function startTurnSequence(attackId) {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;

    toggleCombatButtons(true);

    // Obtém Nível
    if (!window.attackExp[attackId]) window.attackExp[attackId] = { xp: 0, level: 1 };
    let expObj = window.attackExp[attackId];
    
    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, window.enemyFullStats, attackId, expObj.level);
    
    // Subtração de Recursos Locais Baseado no Python
    window.playerStamina = Math.max(0, window.playerStamina - res.stamina_cost);
    window.playerMana = Math.max(0, window.playerMana - res.mana_cost);

    let levelUpMsg = "";
    
    // O inimigo tomou dano? (Ou desviou?)
    if (!res.dodged) {
        window.enemyHP = Math.max(0, window.enemyHP - res.damage);
        
        // XP APENAS SE ACERTAR OU SÓ POR TENTAR? No RPG tradicional, tentativa já dá XP.
        let reqXp = expObj.level * 100;
        expObj.xp += 35; // 35 de XP por uso
        
        if (expObj.xp >= reqXp) {
            expObj.xp -= reqXp;
            expObj.level += 1;
            levelUpMsg = ` \n🌟 A habilidade subiu para o Nível ${expObj.level} (Dano Adicional)!`;
            renderCombatHotbar(); 
        }
    }

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = res.msg + levelUpMsg;

    setTimeout(async () => {
        if (window.enemyHP <= 0) {
            winBattle();
        } else {
            // === TURNO DO INIMIGO (INTELIGÊNCIA DE RECURSOS) ===
            let enemyAtkIds = [1];
            try { enemyAtkIds = typeof window.currentEnemy.attacks === "string" ? JSON.parse(window.currentEnemy.attacks) : window.currentEnemy.attacks; } catch(e){}
            if (!enemyAtkIds || enemyAtkIds.length === 0) enemyAtkIds =[1];
            
            // Filtra os ataques que ele tem recurso para usar
            let affordable = enemyAtkIds.filter(id => {
                const ea = window.gameData.attacks.find(a => a.id == id);
                if(!ea) return false;
                let c = ea.cost !== undefined ? ea.cost : 5;
                if(ea.atk_type === 'phys') return window.enemyStamina >= c;
                return window.enemyMana >= c;
            });

            if (affordable.length > 0) {
                // Tem recurso, ataca
                let randomAtkId = affordable[Math.floor(Math.random() * affordable.length)];
                const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, randomAtkId, 1);
                
                window.enemyStamina = Math.max(0, window.enemyStamina - resE.stamina_cost);
                window.enemyMana = Math.max(0, window.enemyMana - resE.mana_cost);
                
                if (!resE.dodged) {
                    window.playerHP = Math.max(0, window.playerHP - resE.damage);
                    const pContainer = document.getElementById('player-container');
                    if(pContainer) { pContainer.classList.add('enemy-hit'); setTimeout(() => pContainer.classList.remove('enemy-hit'), 200); }
                }
                document.getElementById('combat-dialogue').innerText = `Turno do Inimigo: ${resE.msg}`;

            } else {
                // Sem recursos, ele descansa o turno!
                let maxESp = window.enemyFullStats.computed.stamina;
                let maxEMp = window.enemyFullStats.computed.mana;
                window.enemyStamina = Math.min(maxESp, window.enemyStamina + 20);
                window.enemyMana = Math.min(maxEMp, window.enemyMana + 20);
                
                document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} ofegante... Recuperou o fôlego neste turno!`;
            }

            updateBattleUI();

            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;

                window.updateHUD();
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
    
    window.updateHUD();
    await window.saveGameState();

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
        document.getElementById('combat-dialogue').innerText = "Você conseguiu despistar o inimigo e fugir com sucesso!";
        setTimeout(() => { window.isTurnBusy = false; backToCity(); }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "O inimigo previu seus movimentos e cortou sua rota de fuga!";
        setTimeout(async () => {
            let enemyAtkIds = [1];
            try { enemyAtkIds = JSON.parse(window.currentEnemy.attacks || '[1]'); } catch(e){}
            let randomAtkId = enemyAtkIds[Math.floor(Math.random() * enemyAtkIds.length)];

            const resE = await window.pywebview.api.process_battle_turn(window.enemyFullStats, window.playerFullStats, randomAtkId, 1);
            
            if (!resE.dodged) {
                window.playerHP = Math.max(0, window.playerHP - resE.damage);
            }
            
            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = `${window.currentEnemy.name} contra-atacou: ${resE.msg}`;

            await window.saveGameState();

            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você morreu nas costas. Perdeu ${ouroPerdido} de Ouro!`;
                window.updateHUD();
                await window.saveGameState(); 

                setTimeout(() => { window.playerHP = window.playerFullStats.computed.hp; backToCity(); }, 3500);
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

// === LÓGICA DO MODAL DE GRIMÓRIO (SKILLBOOK) === //
window.openSkillbook = function() {
    document.getElementById('skillbook-modal').style.display = 'flex';
    renderSkillbook();
}

window.closeSkillbook = async function() {
    document.getElementById('skillbook-modal').style.display = 'none';
    await window.saveGameState();
}

window.clearHotbar = function() {
    window.playerHotbar =[null, null, null, null, null, null, null, null, null, null];
    renderSkillbook();
}

function renderSkillbook() {
    const sourceDiv = document.getElementById('sb-drag-source');
    const hotbarDiv = document.getElementById('sb-hotbar-grid');
    sourceDiv.innerHTML = '';
    hotbarDiv.innerHTML = '';

    let attacks =[];
    try { attacks = typeof window.playerAttacks === "string" ? JSON.parse(window.playerAttacks) : window.playerAttacks; } catch(e){}
    
    attacks.forEach(atkId => {
        const atk = window.gameData.attacks.find(a => a.id == atkId);
        if(atk) {
            let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
            const reqXp = expObj.level * 100;
            const pct = (expObj.xp / reqXp) * 100;
            
            sourceDiv.innerHTML += `
                <div class="drag-skill-item hb-atk-${atk.atk_type}" draggable="true" ondragstart="sbDragStart(event, ${atk.id}, 'source')" title="Nível ${expObj.level} | XP: ${expObj.xp}/${reqXp}">
                    <span class="hb-atk-name">${atk.name}</span>
                    <div class="hb-atk-lvl" style="bottom: auto; top: 2px;">Lv${expObj.level}</div>
                    <div style="position:absolute; bottom:0; left:0; height:4px; background:#2ecc71; width:${pct}%;"></div>
                </div>
            `;
        }
    });

    window.playerHotbar.forEach((atkId, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'hotbar-slot ' + (atkId ? '' : 'empty');
        slotDiv.setAttribute('ondragover', 'sbDragOver(event)');
        slotDiv.setAttribute('ondragleave', 'sbDragLeave(event)');
        slotDiv.setAttribute('ondrop', `sbDrop(event, ${index})`);
        
        if (atkId) {
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if (atk) {
                slotDiv.classList.add(`hb-atk-${atk.atk_type}`);
                slotDiv.draggable = true;
                slotDiv.setAttribute('ondragstart', `sbDragStart(event, ${atk.id}, ${index})`);
                let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
                slotDiv.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level}</div>`;
            }
        }
        hotbarDiv.appendChild(slotDiv);
    });
}

// Drag Events
window.sbDragStart = function(ev, atkId, origin) {
    ev.dataTransfer.setData("atkId", atkId);
    ev.dataTransfer.setData("origin", origin);
}
window.sbDragOver = function(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}
window.sbDragLeave = function(ev) {
    ev.currentTarget.classList.remove('drag-over');
}
window.sbDrop = function(ev, targetIndex) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    
    const atkId = parseInt(ev.dataTransfer.getData("atkId"));
    const origin = ev.dataTransfer.getData("origin");

    if (origin !== 'source') {
        const originIndex = parseInt(origin);
        const temp = window.playerHotbar[targetIndex];
        window.playerHotbar[targetIndex] = atkId;
        window.playerHotbar[originIndex] = temp;
    } else {
        window.playerHotbar[targetIndex] = atkId;
    }
    
    renderSkillbook();
}