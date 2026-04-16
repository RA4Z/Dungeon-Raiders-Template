// web/js/stats_system.js
window.STAT_MAP = {
    base: {
        'for': 'Força', 'int': 'Inteligência', 'des': 'Destreza', 
        'car': 'Carisma', 'res': 'Resistência'
    },
    derived: {
        'hp': 'Vida Máxima', 'mana': 'Mana Máxima', 'stamina': 'Stamina Máxima',
        'phys_dmg': 'Dano Físico', 'mag_dmg': 'Dano Mágico',
        'phys_res': 'Defesa Física', 'mag_res': 'Defesa Mágica',
        'crit_rate': 'Taxa Crítica (%)', 'crit_dmg': 'Dano Crítico (%)'
    }
};

window.playerFullStats = null;
window.enemyFullStats = null;

// Simulador Local para Prévia na Criação de Personagem
window.calcStatsLocal = function(baseStats, bonusStats = {}, overrides = {}) {
    let s = {};
    for(let k in window.STAT_MAP.base) s[k] = parseInt(baseStats[k]) || 1;
    for(let k in window.STAT_MAP.base) s[k] += parseInt(bonusStats[k] || 0);

    let computed = {
        hp: 50 + (s.res * 10) + (s.for * 2),
        mana: 10 + (s.int * 10) + (s.car * 2),
        stamina: 20 + (s.des * 5) + (s.res * 5),
        phys_dmg: (s.for * 2) + (s.des * 0.5),
        mag_dmg: (s.int * 2.5) + (s.car * 0.5),
        phys_res: (s.res * 1.5) + (s.for * 0.5),
        mag_res: (s.res * 1.0) + (s.int * 1.0),
        crit_rate: 5.0 + (s.des * 0.5),
        crit_dmg: 150.0 + (s.for * 1.0)
    };

    for(let k in computed) computed[k] += parseFloat(bonusStats[k] || 0);
    
    for(let k in overrides) {
        if(overrides[k] !== "" && overrides[k] !== null && !isNaN(overrides[k])) {
            computed[k] = parseFloat(overrides[k]);
        }
    }
    return { base: s, computed: computed };
};

window.refreshPlayerStats = async function() {
    if(!window.activeSaveId) return;
    window.playerFullStats = await window.pywebview.api.load_save_full_stats(window.activeSaveId);
    if (window.playerHP > window.playerFullStats.computed.hp) window.playerHP = window.playerFullStats.computed.hp;
};

window.refreshEnemyStats = async function(enemyId) {
    window.enemyFullStats = await window.pywebview.api.load_enemy_full_stats(enemyId);
};