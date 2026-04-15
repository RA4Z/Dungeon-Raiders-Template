function openInventory() {
    if(!window.activePlayer) {
        alert("Nenhum personagem selecionado para o inventário!");
        return;
    }
    document.getElementById('inventory-modal').style.display = 'flex';
    document.getElementById('inv-player-name').innerText = window.activePlayer.name;
    renderInventory();
}

function closeInventory() {
    document.getElementById('inventory-modal').style.display = 'none';
    if(typeof updateBattleUI === "function") updateBattleUI();
}

function switchInvTab(tabName, btn) {
    document.querySelectorAll('.inv-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.inv-grid').forEach(g => g.classList.remove('active'));
    document.getElementById(`inv-grid-${tabName}`).classList.add('active');
}

function renderInventory() {
    // 1. Atualiza Status
    document.getElementById('inv-hp').innerText = `${window.playerHP} / ${window.activePlayer.hp}`;
    document.getElementById('inv-gold').innerText = window.playerGold;

    // 2. Renderiza a Paper Doll no Modal
    if (typeof buildBattleCharacter === "function") {
        buildBattleCharacter(window.activePlayer, 'f', 'NULL', 'inv-doll-preview');
    }

    // 3. NOVO: Renderiza as peças EQUIPADAS no corpo do personagem
    const eqContainer = document.getElementById('inv-equipped-list');
    if (eqContainer) {
        eqContainer.innerHTML = '';
        let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

        window.EQUIP_SLOTS.forEach(slot => {
            if(slot === 'base') return; // Não dá pra desequipar o corpo (ficar sem pele)

            const itemId = eqDataMap[slot];
            if (itemId) {
                const itemObj = window.gameData.equipments.find(e => e.id == itemId);
                if (itemObj) {
                    eqContainer.innerHTML += `
                        <div class="inv-eq-slot" onclick="unequipItem('${slot}')" title="Desequipar">
                            <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                            <span style="text-align:center; word-break:break-word;">${itemObj.name}</span>
                        </div>
                    `;
                }
            } else {
                eqContainer.innerHTML += `
                    <div class="inv-eq-slot inv-eq-empty">
                        <div style="height:35px; display:flex; align-items:center; justify-content:center; color:#777;">[Vazio]</div>
                        <span>${slot.toUpperCase()}</span>
                    </div>
                `;
            }
        });
    }

    // 4. Grid de Equipamentos guardados na Mochila
    const gridEq = document.getElementById('inv-grid-equipments');
    gridEq.innerHTML = '';
    window.playerInventory.equipments.forEach((itemId, idx) => {
        const itemObj = window.gameData.equipments.find(e => e.id == itemId);
        if(itemObj) {
            gridEq.innerHTML += `
                <div class="inv-item-card" onclick="equipItem(${idx})" title="Atk:${itemObj.bonus_str} | Def:${itemObj.def_phys}\nEquipar">
                    <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                    <span class="inv-item-name">${itemObj.name}</span>
                    <span class="inv-item-qty">${itemObj.type.toUpperCase()}</span>
                </div>
            `;
        }
    });

    // 5. Grid de Consumíveis
    const gridCons = document.getElementById('inv-grid-consumables');
    gridCons.innerHTML = '';
    for(let cId in window.playerInventory.consumables) {
        const qty = window.playerInventory.consumables[cId];
        if(qty > 0) {
            const itemObj = window.gameData.consumables.find(c => c.id == cId);
            if(itemObj) {
                gridCons.innerHTML += `
                    <div class="inv-item-card" onclick="useConsumable(${cId})" title="Efeito: ${itemObj.effect_type} +${itemObj.effect_value}\nUsar Poção">
                        <img src="${itemObj.img_path || 'assets/potion.png'}" onerror="this.style.display='none'">
                        <span class="inv-item-name">${itemObj.name}</span>
                        <span class="inv-item-qty">Qtde: ${qty}</span>
                    </div>
                `;
            }
        }
    }
}

// FUNÇÃO PARA EQUIPAR (Já existia, mas melhorada)
async function equipItem(invIndex) {
    if(window.activePlayer.race !== 'humano') {
        alert("Monstros não podem equipar roupas/armas!"); return;
    }

    const newItemId = window.playerInventory.equipments[invIndex];
    const newItemDef = window.gameData.equipments.find(e => e.id == newItemId);
    if (!newItemDef) return;
    
    // Tira do inventário
    window.playerInventory.equipments.splice(invIndex, 1);
    
    // Verifica slot e joga o item velho pra mochila
    const slot = newItemDef.type;
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;
    
    if(eqDataMap[slot]) {
        window.playerInventory.equipments.push(eqDataMap[slot]);
    }
    
    eqDataMap[slot] = newItemId;
    window.activePlayer.equipment_data = eqDataMap;

    await window.pywebview.api.sync_player_state(
        window.activePlayer.id, window.playerHP, 
        JSON.stringify(window.playerInventory), JSON.stringify(window.activePlayer.equipment_data)
    );

    renderInventory();
    
    if(document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

// NOVA: FUNÇÃO PARA DESEQUIPAR
async function unequipItem(slot) {
    if(window.activePlayer.race !== 'humano') return;

    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

    // Verifica se realmente existe algo equipado no slot
    if(!eqDataMap[slot]) return; 

    const itemId = eqDataMap[slot];

    // Joga de volta pra lista de equipamentos da mochila
    window.playerInventory.equipments.push(itemId);

    // Apaga do corpo do personagem
    delete eqDataMap[slot];
    window.activePlayer.equipment_data = eqDataMap;

    // Salva a alteração no Banco de Dados
    await window.pywebview.api.sync_player_state(
        window.activePlayer.id, 
        window.playerHP, 
        JSON.stringify(window.playerInventory), 
        JSON.stringify(window.activePlayer.equipment_data)
    );

    // Recarrega a tela para a roupa sumir da prévia
    renderInventory();
    
    // Se a aba de combate estiver atrás do modal, atualiza a imagem do herói nela
    if(document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

// USA ITEM DE CURA
async function useConsumable(cId) {
    if(window.playerHP >= window.activePlayer.hp) {
        alert("Seu HP já está no máximo!"); return;
    }

    const itemObj = window.gameData.consumables.find(c => c.id == cId);
    if(itemObj && itemObj.effect_type === 'heal_hp') {
        window.playerHP = Math.min(window.activePlayer.hp, window.playerHP + itemObj.effect_value);
        
        window.playerInventory.consumables[cId]--;
        if(window.playerInventory.consumables[cId] <= 0) {
            delete window.playerInventory.consumables[cId];
        }

        await window.pywebview.api.sync_player_state(
            window.activePlayer.id, window.playerHP, 
            JSON.stringify(window.playerInventory), 
            typeof window.activePlayer.equipment_data === 'string' ? window.activePlayer.equipment_data : JSON.stringify(window.activePlayer.equipment_data)
        );

        renderInventory();
    }
}