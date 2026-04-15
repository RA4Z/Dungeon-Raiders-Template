// Variáveis Globais de Estado do Banco e Jogo
window.gameData = {
    bodies: [], equipments:[], consumables: [], characters:[]
};

// Ordem estrita das camadas da Paper Doll para o Z-Index
window.EQUIP_SLOTS =[
    'base',       // z-index: 0 (Corpo base)
    'face',       // z-index: 1
    'hair',       // z-index: 2
    'pants',      // z-index: 3
    'shirt',      // z-index: 4
    'boots',      // z-index: 5
    'gloves',     // z-index: 6
    'helmet',     // z-index: 7
    'accessory',  // z-index: 8
    'hand_l',     // z-index: 9  (Escudo/Arco)
    'hand_r'      // z-index: 10 (Espada principal)
];

// Estado da Sessão (Batalha/Cidade)
window.activePlayer = null;
window.currentEnemy = null;
window.playerHP = 0;
window.enemyHP = 0;
window.isTurnBusy = false;

// Função Utilitária Global para atualizar as imagens prévias nos inputs
window.updateMiniPrev = function(inputId, imgId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(imgId).src = val || "";
};