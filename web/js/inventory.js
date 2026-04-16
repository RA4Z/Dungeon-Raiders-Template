// web/js/inventory.js

let isAltPressed = false;
let hoveredItem = null; // Guarda o item atual que o mouse está em cima

// Listeners globais para a tecla ALT
window.addEventListener('keydown', (e) => { if (e.key === 'Alt') { isAltPressed = true; updateTooltip(); } });
window.addEventListener('keyup', (e) => { if (e.key === 'Alt') { isAltPressed = false; updateTooltip(); } });

// Segue o mouse
window.addEventListener('mousemove', (e) => {
    const tooltip = document.getElementById('item-tooltip');
    if (tooltip && tooltip.style.display === 'block') {
        // Posiciona perto do mouse, garantindo que não saia da tela
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        if (x + 280 > window.innerWidth) x = window.innerWidth - 290;
        if (y + tooltip.offsetHeight > window.innerHeight) y = window.innerHeight - tooltip.offsetHeight - 10;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
});

async function openInventory() {
    if (!window.activePlayer) return alert("Nenhum personagem ativo!");

    // GARANTE QUE OS STATUS ESTÃO CARREGADOS ANTES DE ABRIR
    await window.refreshPlayerStats();

    document.getElementById('inventory-modal').style.display = 'flex';
    document.getElementById('inv-player-name').innerText = window.activePlayer.name;
    await renderInventory();
}

function closeInventory() {
    document.getElementById('inventory-modal').style.display = 'none';
    hideTooltip();

    if (document.getElementById('combat-screen').classList.contains('active-view')) {
        if (typeof updateBattleUI === "function") updateBattleUI();
    }
}
function switchInvTab(tabName, btn) {
    document.querySelectorAll('.inv-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.inv-grid').forEach(g => g.classList.remove('active'));
    document.getElementById(`inv-grid-${tabName}`).classList.add('active');
}

async function syncInventoryToDB() {
    await window.saveGameState();
}

async function renderInventory() {
    // 1. Corrige o undefined: Lê da Engine de Status
    const maxHp = window.playerFullStats.computed.hp;
    document.getElementById('inv-hp').innerText = `${window.playerHP} / ${maxHp}`;
    document.getElementById('inv-gold').innerText = window.playerGold;

    // 2. Renderiza Painel de Status
    const statsPane = document.getElementById('inv-full-stats-list');
    if (statsPane) {
        let html = '<h4 style="color:#2ecc71;">Atributos Base</h4>';
        for (let k in window.STAT_MAP.base) {
            html += `<div style="display:flex; justify-content:space-between;"><span>${window.STAT_MAP.base[k]}</span> <strong>${window.playerFullStats.base[k]}</strong></div>`;
        }
        html += '<h4 style="color:#e74c3c; margin-top:15px;">Sub-Status de Combate</h4>';
        for (let k in window.STAT_MAP.derived) {
            let val = window.playerFullStats.computed[k];
            // Formata taxa critica pra ter o % visivel
            if (k.includes('crit')) val = val.toFixed(1) + '%';
            else val = val.toFixed(0);
            html += `<div style="display:flex; justify-content:space-between;"><span>${window.STAT_MAP.derived[k]}</span> <strong>${val}</strong></div>`;
        }
        statsPane.innerHTML = html;
    }

    // 3. Renderiza Imagem do Personagem
    if (typeof buildBattleCharacter === "function") {
        await buildBattleCharacter(window.activePlayer, 'f', null, 'inv-doll-preview');
    }

    // 4. Equipados
    const eqContainer = document.getElementById('inv-equipped-list');
    if (eqContainer) {
        eqContainer.innerHTML = '';
        let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

        window.EQUIP_SLOTS.forEach(slot => {
            if (slot === 'base') return;
            const itemId = eqDataMap[slot];
            if (itemId) {
                const itemObj = window.gameData.equipments.find(e => e.id == itemId);
                if (itemObj) {
                    eqContainer.innerHTML += `
                        <div class="inv-eq-slot" onclick="unequipItem('${slot}')" onmouseenter="showTooltip(${itemObj.id}, 'equip')" onmouseleave="hideTooltip()">
                            <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                            <span>${itemObj.name}</span>
                        </div>
                    `;
                }
            } else {
                eqContainer.innerHTML += `<div class="inv-eq-slot inv-eq-empty"><div>[Vazio]</div><span>${slot.toUpperCase()}</span></div>`;
            }
        });
    }

    // 5. Mochila Equipamentos
    const gridEq = document.getElementById('inv-grid-equipments');
    gridEq.innerHTML = '';
    window.playerInventory.equipments.forEach((itemId, idx) => {
        const itemObj = window.gameData.equipments.find(e => e.id == itemId);
        if (itemObj) {
            gridEq.innerHTML += `
                <div class="inv-item-card" onclick="equipItem(${idx})" onmouseenter="showTooltip(${itemObj.id}, 'equip')" onmouseleave="hideTooltip()">
                    <img src="${itemObj.img_front || 'assets/no_image.png'}" onerror="this.style.display='none'">
                    <span class="inv-item-name">${itemObj.name}</span>
                    <span class="inv-item-qty">${itemObj.type.toUpperCase()}</span>
                </div>
            `;
        }
    });

    // 6. Mochila Consumíveis
    const gridCons = document.getElementById('inv-grid-consumables');
    gridCons.innerHTML = '';
    for (let cId in window.playerInventory.consumables) {
        const qty = window.playerInventory.consumables[cId];
        if (qty > 0) {
            const itemObj = window.gameData.consumables.find(c => c.id == cId);
            if (itemObj) {
                gridCons.innerHTML += `
                    <div class="inv-item-card" onclick="useConsumable(${cId})" onmouseenter="showTooltip(${itemObj.id}, 'cons')" onmouseleave="hideTooltip()">
                        <img src="${itemObj.img_path || 'assets/potion.png'}" onerror="this.style.display='none'">
                        <span class="inv-item-name">${itemObj.name}</span>
                        <span class="inv-item-qty">Qtde: ${qty}</span>
                    </div>
                `;
            }
        }
    }
}

// ==========================================
// SISTEMA DE TOOLTIP E COMPARAÇÃO COM ALT
// ==========================================
function showTooltip(itemId, type) {
    hoveredItem = { id: itemId, type: type };
    updateTooltip();
}

function hideTooltip() {
    hoveredItem = null;
    document.getElementById('item-tooltip').style.display = 'none';
}

function updateTooltip() {
    if (!hoveredItem) return;

    const tooltip = document.getElementById('item-tooltip');
    tooltip.style.display = 'block';

    if (hoveredItem.type === 'cons') {
        const item = window.gameData.consumables.find(c => c.id == hoveredItem.id);
        tooltip.innerHTML = `
            <h3 style="color:#f1c40f; margin-bottom:5px;">${item.name}</h3>
            <span style="color:#bdc3c7;">Consumível</span>
            <hr style="border:1px solid #444; margin: 5px 0;">
            <p>Efeito: ${item.effect_type === 'heal_hp' ? 'Curar Vida' : item.effect_type}</p>
            <p style="color:#2ecc71; font-weight:bold;">Valor: +${item.effect_value}</p>
        `;
        return;
    }

    // EQUIPAMENTOS (Com suporte a ALT)
    const item = window.gameData.equipments.find(e => e.id == hoveredItem.id);
    let itemMods = {};
    try { itemMods = JSON.parse(item.stats_modifiers || '{}'); } catch (e) { }

    let html = `
        <h3 style="color:#3498db; margin-bottom:5px;">${item.name}</h3>
        <span style="color:#bdc3c7;">Equipamento: ${item.type.toUpperCase()}</span>
        <hr style="border:1px solid #444; margin: 5px 0;">
    `;

    // Verifica item atual no corpo
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;
    let equippedItemId = eqDataMap[item.type];
    let equippedMods = {};

    if (equippedItemId && isAltPressed) {
        const eqItem = window.gameData.equipments.find(e => e.id == equippedItemId);
        if (eqItem) {
            try { equippedMods = JSON.parse(eqItem.stats_modifiers || '{}'); } catch (e) { }
            html += `<p style="color:#e67e22; font-size:0.8em; margin-bottom:10px;">[Comparando com: ${eqItem.name}]</p>`;
        }
    } else if (!isAltPressed && equippedItemId && equippedItemId != item.id) {
        html += `<p style="color:#7f8c8d; font-size:0.8em; margin-bottom:10px;">Pressione <kbd>ALT</kbd> para comparar</p>`;
    }

    const allKeys = [...new Set([...Object.keys(itemMods), ...Object.keys(equippedMods)])];

    if (allKeys.length === 0) {
        html += `<p style="color:#777;">Sem modificadores mágicos.</p>`;
    } else {
        allKeys.forEach(k => {
            const valNovo = parseFloat(itemMods[k] || 0);
            const valAntigo = parseFloat(equippedMods[k] || 0);
            let name = window.STAT_MAP.base[k] || window.STAT_MAP.derived[k] || k;

            if (isAltPressed) {
                let diff = valNovo - valAntigo;
                let color = diff > 0 ? '#2ecc71' : (diff < 0 ? '#e74c3c' : '#bdc3c7');
                let sign = diff > 0 ? '+' : '';
                if (diff !== 0) {
                    html += `<div style="display:flex; justify-content:space-between;"><span>${name}</span> <strong style="color:${color}">${sign}${diff}</strong></div>`;
                } else if (valNovo !== 0) {
                    html += `<div style="display:flex; justify-content:space-between;"><span>${name}</span> <strong style="color:#bdc3c7;">=${valNovo}</strong></div>`;
                }
            } else {
                if (valNovo !== 0) {
                    let sign = valNovo > 0 ? '+' : '';
                    let color = valNovo > 0 ? '#3498db' : '#e74c3c';
                    html += `<div style="display:flex; justify-content:space-between;"><span>${name}</span> <strong style="color:${color}">${sign}${valNovo}</strong></div>`;
                }
            }
        });
    }
    tooltip.innerHTML = html;
}

// ... as funções equipItem, unequipItem e useConsumable mantêm a mesma estrutura,
// só garantindo que chamam `await window.refreshPlayerStats()` antes de renderInventory.

async function equipItem(invIndex) {
    const newItemId = window.playerInventory.equipments[invIndex];
    const newItemDef = window.gameData.equipments.find(e => e.id == newItemId);
    if (!newItemDef) return;

    window.playerInventory.equipments.splice(invIndex, 1);

    const slot = newItemDef.type;
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;

    if (eqDataMap[slot]) window.playerInventory.equipments.push(eqDataMap[slot]);
    eqDataMap[slot] = newItemId;
    window.activePlayer.equipment_data = eqDataMap;

    await syncInventoryToDB();
    await window.refreshPlayerStats(); // Recalcula stats (Importante!)
    await renderInventory();

    if (document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

async function unequipItem(slot) {
    let eqDataMap = typeof window.activePlayer.equipment_data === 'string' ? JSON.parse(window.activePlayer.equipment_data) : window.activePlayer.equipment_data;
    if (!eqDataMap[slot]) return;

    const itemId = eqDataMap[slot];
    window.playerInventory.equipments.push(itemId);

    delete eqDataMap[slot];
    window.activePlayer.equipment_data = eqDataMap;

    await syncInventoryToDB();
    await window.refreshPlayerStats();
    await renderInventory();

    if (document.getElementById('combat-screen').classList.contains('active-view')) {
        buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');
    }
}

async function useConsumable(cId) {
    const maxHp = window.playerFullStats.computed.hp;
    if (window.playerHP >= maxHp) return alert("Seu HP já está no máximo!");

    const itemObj = window.gameData.consumables.find(c => c.id == cId);
    if (itemObj && itemObj.effect_type === 'heal_hp') {
        window.playerHP = Math.min(maxHp, window.playerHP + itemObj.effect_value);
        window.playerInventory.consumables[cId]--;
        if (window.playerInventory.consumables[cId] <= 0) delete window.playerInventory.consumables[cId];

        await syncInventoryToDB();
        await renderInventory();
    }
}