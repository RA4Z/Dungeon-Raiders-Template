async function openInventory() {
    if(!window.activePlayer) {
        alert("Nenhum personagem selecionado para o inventário!");
        return;
    }
    document.getElementById('inventory-modal').style.display = 'flex';
    document.getElementById('inv-player-name').innerText = window.activePlayer.name;
    await renderInventory();
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

async function syncInventoryToDB() {
    await window.pywebview.api.sync_player_state(
        window.activeSaveId, 
        window.playerHP, 
        JSON.stringify(window.playerInventory), 
        JSON.stringify(window.activePlayer.equipment_data)
    );
}

// CORRIGIDO: Adicionado a palavra "async" aqui
async function renderInventory() {
    document.getElementById('inv-hp').innerText = `${window.playerHP} / ${window.activePlayer.hp}`;
    document.getElementById('inv-gold').innerText = window.playerGold;

    if (typeof buildBattleCharacter === "function") {
        await buildBattleCharacter(window.activePlayer, 'f', null, 'inv-doll-preview');
    }

    const eqContainer = document.getElementById('inv-equipped-list');
    if (eqContainer) {
        eqContainer.innerHTML = '';
        let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

        window.EQUIP_SLOTS.forEach(slot => {
            if(slot === 'base') return; 

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

    const gridEq = document.getElementById('inv-grid-equipments');
    gridEq.innerHTML = '';
    window.playerInventory.equipments.forEach((itemId, idx) => {
        const itemObj = window.gameData.equipments.find(e => e.id == itemId);
        if(itemObj) {
            gridEq.innerHTML += `
                <div class="inv-item-card" onclick="equipItem(${idx})" title="Clique para Equipar">
                    <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                    <span class="inv-item-name">${itemObj.name}</span>
                    <span class="inv-item-qty">${itemObj.type.toUpperCase()}</span>
                </div>
            `;
        }
    });

    const gridCons = document.getElementById('inv-grid-consumables');
    gridCons.innerHTML = '';
    for(let cId in window.playerInventory.consumables) {
        const qty = window.playerInventory.consumables[cId];
        if(qty > 0) {
            const itemObj = window.gameData.consumables.find(c => c.id == cId);
            if(itemObj) {
                gridCons.innerHTML += `
                    <div class="inv-item-card" onclick="useConsumable(${cId})" title="Clique para Usar">
                        <img src="${itemObj.img_path || 'assets/potion.png'}" onerror="this.style.display='none'">
                        <span class="inv-item-name">${itemObj.name}</span>
                        <span class="inv-item-qty">Qtde: ${qty}</span>
                    </div>
                `;
            }
        }
    }
}

async function equipItem(invIndex) {
    const newItemId = window.playerInventory.equipments[invIndex];
    const newItemDef = window.gameData.equipments.find(e => e.id == newItemId);
    if (!newItemDef) return;
    
    window.playerInventory.equipments.splice(invIndex, 1);
    
    const slot = newItemDef.type;
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;
    
    if(eqDataMap[slot]) {
        window.playerInventory.equipments.push(eqDataMap[slot]);
    }
    
    eqDataMap[slot] = newItemId;
    window.activePlayer.equipment_data = eqDataMap;

    await window.refreshPlayerStats();
    await syncInventoryToDB();
    await renderInventory();
    
    if(document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

async function unequipItem(slot) {
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

    if(!eqDataMap[slot]) return; 

    const itemId = eqDataMap[slot];
    window.playerInventory.equipments.push(itemId);

    delete eqDataMap[slot];
    window.activePlayer.equipment_data = eqDataMap;

    await window.refreshPlayerStats();
    await syncInventoryToDB();
    await renderInventory();
    
    if(document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

async function useConsumable(cId) {
    if(window.playerHP >= window.playerFullStats.computed.hp) {
        alert("Seu HP já está no máximo!"); return;
    }

    const itemObj = window.gameData.consumables.find(c => c.id == cId);
    if(itemObj && itemObj.effect_type === 'heal_hp') {
        window.playerHP = Math.min(window.playerFullStats.computed.hp, window.playerHP + itemObj.effect_value);
        
        window.playerInventory.consumables[cId]--;
        if(window.playerInventory.consumables[cId] <= 0) {
            delete window.playerInventory.consumables[cId];
        }

        await syncInventoryToDB();
        await renderInventory();
    }
}