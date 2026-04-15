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
    // Se fechou dentro da batalha (na pausa), atualiza as barras:
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

    // 2. Renderiza a Paper Doll no Modal do Inventario
    buildBattleCharacter(window.activePlayer, 'f', 'NULL', 'inv-doll-preview');

    // 3. Grid de Equipamentos
    const gridEq = document.getElementById('inv-grid-equipments');
    gridEq.innerHTML = '';
    window.playerInventory.equipments.forEach((itemId, idx) => {
        const itemObj = window.gameData.equipments.find(e => e.id == itemId);
        if(itemObj) {
            gridEq.innerHTML += `
                <div class="inv-item-card" onclick="equipItem(${idx})" title="Atk:${itemObj.bonus_str} | Def:${itemObj.def_phys}\nClique para Equipar">
                    <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                    <span class="inv-item-name">${itemObj.name}</span>
                    <span class="inv-item-qty">${itemObj.type.toUpperCase()}</span>
                </div>
            `;
        }
    });

    // 4. Grid de Consumíveis
    const gridCons = document.getElementById('inv-grid-consumables');
    gridCons.innerHTML = '';
    for(let cId in window.playerInventory.consumables) {
        const qty = window.playerInventory.consumables[cId];
        if(qty > 0) {
            const itemObj = window.gameData.consumables.find(c => c.id == cId);
            if(itemObj) {
                gridCons.innerHTML += `
                    <div class="inv-item-card" onclick="useConsumable(${cId})" title="Efeito: ${itemObj.effect_type} +${itemObj.effect_value}\nClique para Usar">
                        <img src="${itemObj.img_path || 'assets/potion.png'}" onerror="this.style.display='none'">
                        <span class="inv-item-name">${itemObj.name}</span>
                        <span class="inv-item-qty">Qtde: ${qty}</span>
                    </div>
                `;
            }
        }
    }
}

// EQUIPA O ITEM, DEVOLVE O ANTIGO E SALVA NO BD
async function equipItem(invIndex) {
    if(window.activePlayer.race !== 'humano') {
        alert("Monstros não podem equipar roupas/armas!"); return;
    }

    const newItemId = window.playerInventory.equipments[invIndex];
    const newItemDef = window.gameData.equipments.find(e => e.id == newItemId);
    
    // Tira do inventário
    window.playerInventory.equipments.splice(invIndex, 1);
    
    // Verifica se tinha algo equipado no slot (e bota no inventário)
    const slot = newItemDef.type;
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;
    
    if(eqDataMap[slot]) {
        window.playerInventory.equipments.push(eqDataMap[slot]);
    }
    
    // Equipa o novo
    eqDataMap[slot] = newItemId;
    window.activePlayer.equipment_data = eqDataMap;

    // Sincroniza API (Salva no BD)
    await window.pywebview.api.sync_player_state(
        window.activePlayer.id, 
        window.playerHP, 
        JSON.stringify(window.playerInventory), 
        JSON.stringify(window.activePlayer.equipment_data)
    );

    // Re-render
    renderInventory();
    
    // Caso esteja na tela de combate rolando, atualiza as costas do boneco
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
        
        // Remove 1
        window.playerInventory.consumables[cId]--;
        if(window.playerInventory.consumables[cId] <= 0) {
            delete window.playerInventory.consumables[cId];
        }

        // Sincroniza API
        await window.pywebview.api.sync_player_state(
            window.activePlayer.id, 
            window.playerHP, 
            JSON.stringify(window.playerInventory), 
            typeof window.activePlayer.equipment_data === 'string' ? window.activePlayer.equipment_data : JSON.stringify(window.activePlayer.equipment_data)
        );

        renderInventory();
    }
}