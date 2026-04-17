// frontend/src/js/systems/stats_calc.js

/**
 * Lê os inputs do DOM no painel "Montar Personagem" (Builder), 
 * extrai bônus e calcula a prévia dos status em tempo real.
 */
window.updateLiveStatsPreview = function() {
    const race = document.getElementById('ch-race')?.value || 'humano';

    // 1. Extrai os atributos base dos inputs
    let base = {};
    document.querySelectorAll('.char-base-stat').forEach(i => {
        base[i.dataset.stat] = parseInt(i.value) || 1;
    });
    
    // 2. Extrai overrides (sub-status forçados para monstros)
    let overrides = {};
    if (race === 'monstro') {
        document.querySelectorAll('.char-sub-stat').forEach(i => {
            if (i.value !== "") {
                overrides[i.dataset.stat] = parseFloat(i.value);
            }
        });
    }

    // 3. Extrai bônus de equipamentos selecionados (apenas para humanos)
    let bonus = {};
    if (race === 'humano') {
        (window.EQUIP_SLOTS ||[]).forEach(slot => {
            const el = document.getElementById(`sel-${slot}`);
            if (el && el.value && slot !== 'base') {
                const eq = window.gameData.equipments.find(e => e.id == el.value);
                if (eq && eq.stats_modifiers) {
                    try {
                        let mods = JSON.parse(eq.stats_modifiers);
                        for (let k in mods) {
                            bonus[k] = (bonus[k] || 0) + parseFloat(mods[k]);
                        }
                    } catch(e) {
                        console.error("Erro ao interpretar modifiers do equipamento", e);
                    }
                }
            }
        });
    }

    // 4. Calcula os status finais (depende da função no stats_system.js)
    const finalStats = window.calcStatsLocal(base, bonus, overrides);
    
    // 5. Renderiza a tabela de visualização
    const viewGrid = document.getElementById('live-stats-preview');
    if (viewGrid) {
        viewGrid.innerHTML = '';
        for (let k in finalStats.computed) {
            let name = window.STAT_MAP.derived[k] || k;
            let val = finalStats.computed[k].toFixed(1);
            viewGrid.innerHTML += `<span><strong>${name}:</strong> <span style="color:#2ecc71;">${val}</span></span>`;
        }
    }
};