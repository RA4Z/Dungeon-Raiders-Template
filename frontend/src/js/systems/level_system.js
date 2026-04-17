// web/js/level_system.js

// Fórmula: O XP necessário é o Nível Atual x 100.
// Ex: Lvl 1 -> 100 XP. Lvl 5 -> 500 XP.
window.getXpRequired = function(level) {
    return level * 100;
};

// Função para adicionar XP e verificar o Level Up
window.addStatExp = async function(statKey, xpAmount) {
    window.playerStatExp[statKey] += xpAmount;
    let leveledUp = false;
    
    // Loop para caso o jogador ganhe muito XP de uma vez e passe vários níveis
    while (true) {
        let currentLevel = window.activePlayer.base_stats[statKey];
        let requiredXp = window.getXpRequired(currentLevel);
        
        if (window.playerStatExp[statKey] >= requiredXp) {
            window.playerStatExp[statKey] -= requiredXp;
            window.activePlayer.base_stats[statKey]++; // Sobe de nível!
            leveledUp = true;
        } else {
            break; // Não tem XP suficiente para o próximo nível
        }
    }
    
    if (leveledUp) {
        // Recalcula o HP e Danos baseado no novo nível
        await window.refreshPlayerStats();
        // Opcional: Curar o player ao subir de nível
        window.playerHP = window.playerFullStats.computed.hp; 
    }
    
    await window.saveGameState(); // Salva no banco de dados
    return leveledUp;
};