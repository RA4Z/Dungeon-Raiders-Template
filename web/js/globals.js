window.gameData = { bodies: [], equipments: [], consumables: [], characters: [] };
window.EQUIP_SLOTS = ['base', 'face', 'hair', 'pants', 'shirt', 'boots', 'gloves', 'helmet', 'accessory', 'hand_l', 'hand_r'];

window.activeSaveId = null;
window.activePlayer = null;
window.playerHP = 100;
window.enemyHP = 0;
window.isTurnBusy = false;
window.playerInventory = { equipments: [], consumables: {} };
window.playerGold = 0;
window.playerDays = 1;
window.playerStatExp = { 'for': 0, 'int': 0, 'des': 0, 'car': 0, 'res': 0 };

window.updateMiniPrev = function (inputId, imgId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(imgId).src = val || "";
};

// ====================================================
// SHADER ENGINE (Tradução da Lógica Godot para HTML5 Canvas)
// ====================================================
window.applyShaderTint = async function (imgSrc, hexColor) {
    if (!imgSrc) return null;
    if (!hexColor || hexColor.toLowerCase() === "#ffffff") return imgSrc; // Branco não precisa de shader

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

            // Converter Hex para Float RGB (0.0 até 1.0)
            const r = parseInt(hexColor.slice(1, 3), 16) / 255.0;
            const g = parseInt(hexColor.slice(3, 5), 16) / 255.0;
            const b = parseInt(hexColor.slice(5, 7), 16) / 255.0;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255.0;

                // Só aplica se não for totalmente transparente
                if (alpha > 0) {
                    // Calcula Brightness: (R + G + B) / 3
                    const br = (data[i] + data[i + 1] + data[i + 2]) / (3.0 * 255.0);

                    // Preserva linhas pretas escurecidas (Brightness > 0.1)
                    if (br > 0.1) {
                        data[i] = Math.min(255, data[i] * r);     // Red
                        data[i + 1] = Math.min(255, data[i + 1] * g);   // Green
                        data[i + 2] = Math.min(255, data[i + 2] * b);   // Blue
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL()); // Devolve a imagem alterada em formato Base64
        };

        img.onerror = () => resolve(imgSrc); // Fallback: se der erro, retorna a normal
        img.src = imgSrc;
    });
};

window.saveGameState = async function () {
    if (!window.activeSaveId || !window.activePlayer) return;

    const eqStr = typeof window.activePlayer.equipment_data === 'string' ? window.activePlayer.equipment_data : JSON.stringify(window.activePlayer.equipment_data);
    const baseStr = typeof window.activePlayer.base_stats === 'string' ? window.activePlayer.base_stats : JSON.stringify(window.activePlayer.base_stats);

    try {
        await window.pywebview.api.sync_player_state(
            window.activeSaveId, window.playerHP, window.playerGold,
            JSON.stringify(window.playerInventory), eqStr,
            window.playerDays, baseStr, JSON.stringify(window.playerStatExp)
        );
    } catch (err) { console.error("Erro ao salvar:", err); }
};
