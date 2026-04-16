window.gameData = { bodies:[], equipments:[], consumables: [], characters:[] };
window.EQUIP_SLOTS =['base', 'face', 'hair', 'pants', 'shirt', 'boots', 'gloves', 'helmet', 'accessory', 'hand_l', 'hand_r'];

window.activeSaveId = null; // Agora a sessão é controlada pelo Save!
window.activePlayer = null; 

window.playerHP = 100;
window.enemyHP = 0;
window.isTurnBusy = false;
window.playerInventory = { equipments:[], consumables: {} };
window.playerGold = 0;

window.updateMiniPrev = function(inputId, imgId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(imgId).src = val || "";
};