window.gameData = { bodies:[], equipments:[], consumables: [], characters:[], attacks: [] };
window.EQUIP_SLOTS =['base', 'face', 'hair', 'pants', 'shirt', 'boots', 'gloves', 'helmet', 'accessory', 'hand_l', 'hand_r'];

window.activeSaveId = null;
window.activePlayer = null;

// Gestão de Recursos Atuais (Player e Inimigo)
window.playerHP = 100; window.playerMana = 100; window.playerStamina = 100;
window.enemyHP = 0;    window.enemyMana = 0;    window.enemyStamina = 0;

window.isTurnBusy = false;
window.playerInventory = { equipments:[], consumables: {} };
window.playerGold = 0;
window.playerDays = 1;
window.playerStatExp = { 'for': 0, 'int': 0, 'des': 0, 'car': 0, 'res': 0 };

window.playerAttacks = [1]; 
window.playerHotbar =[1, null, null, null, null, null, null, null, null, null];
window.attackExp = { "1": { xp: 0, level: 1 } };

// Sincroniza HUD de Topo, Cidade e Inventário
window.updateHUD = function() {
    // Atualiza status na barra inferior da cidade
    const statusEl = document.getElementById('session-status');
    if (statusEl && window.activePlayer) {
        statusEl.innerText = `Herói: ${window.activePlayer.name} | Ouro: ${window.playerGold}`;
    }
    
    // Atualiza dias na barra inferior da cidade
    const daysEl = document.getElementById('session-days');
    if (daysEl) daysEl.innerText = `Dia: ${window.playerDays}`;
    
    // Atualiza ouro no inventário
    const invGold = document.getElementById('inv-gold');
    if (invGold) invGold.innerText = window.playerGold;

    // Atualiza HP/MP/SP no inventário
    const invHp = document.getElementById('inv-hp');
    const invMp = document.getElementById('inv-mp');
    const invSp = document.getElementById('inv-sp');
    if(invHp && window.playerFullStats) invHp.innerText = `${Math.floor(window.playerHP)} / ${Math.floor(window.playerFullStats.computed.hp)}`;
    if(invMp && window.playerFullStats) invMp.innerText = `${Math.floor(window.playerMana)} / ${Math.floor(window.playerFullStats.computed.mana)}`;
    if(invSp && window.playerFullStats) invSp.innerText = `${Math.floor(window.playerStamina)} / ${Math.floor(window.playerFullStats.computed.stamina)}`;
};

window.updateMiniPrev = function (inputId, imgId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(imgId).src = val || "";
};

window.applyShaderTint = async function (imgSrc, hexColor) {
    if (!imgSrc) return null;
    if (!hexColor || hexColor.toLowerCase() === "#ffffff") return imgSrc;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const r = parseInt(hexColor.slice(1, 3), 16) / 255.0;
            const g = parseInt(hexColor.slice(3, 5), 16) / 255.0;
            const b = parseInt(hexColor.slice(5, 7), 16) / 255.0;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255.0;
                if (alpha > 0) {
                    const br = (data[i] + data[i + 1] + data[i + 2]) / (3.0 * 255.0);
                    if (br > 0.1) {
                        data[i] = Math.min(255, data[i] * r);     
                        data[i + 1] = Math.min(255, data[i + 1] * g);   
                        data[i + 2] = Math.min(255, data[i + 2] * b);   
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL()); 
        };

        img.onerror = () => resolve(imgSrc); 
        img.src = imgSrc;
    });
};

window.saveGameState = async function () {
    if (!window.activeSaveId || !window.activePlayer) return;

    const eqStr = typeof window.activePlayer.equipment_data === 'string' ? window.activePlayer.equipment_data : JSON.stringify(window.activePlayer.equipment_data);
    const baseStr = typeof window.activePlayer.base_stats === 'string' ? window.activePlayer.base_stats : JSON.stringify(window.activePlayer.base_stats);

    try {
        await window.pywebview.api.sync_player_state(
            window.activeSaveId, 
            window.playerHP, window.playerMana, window.playerStamina, 
            window.playerGold,
            JSON.stringify(window.playerInventory), eqStr,
            window.playerDays, baseStr, JSON.stringify(window.playerStatExp),
            JSON.stringify(window.playerAttacks),
            JSON.stringify(window.playerHotbar),
            JSON.stringify(window.attackExp)
        );
    } catch (err) { console.error("Erro ao salvar:", err); }
};