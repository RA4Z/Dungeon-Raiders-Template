// web/js/game_city.js

function setView(viewId) {
    document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
}

function backToCity() {
    setView('city-screen');
}

async function goToLocation(locType) {
    if (!window.activePlayer) {
        alert("Por favor, selecione um Personagem Ativo na barra inferior antes de explorar!");
        return;
    }

    if (locType === 'caverna') {
        if (window.playerHP <= 0) {
            alert("Você está gravemente ferido! Vá para casa descansar e recuperar seu HP antes de explorar as cavernas.");
            return;
        }
        enterDungeon(); 
        return;
    }

    // TRAVA: Impede de treinar se o HP for menor que 20
    if (locType === 'quartel' && window.playerHP < 20) {
        alert("Você está muito cansado e machucado para treinar! Vá para casa descansar primeiro (HP atual menor que 20).");
        return;
    }

    setView('location-screen');
    const title = document.getElementById('loc-title');
    const text = document.getElementById('loc-text');
    const actBox = document.getElementById('loc-actions');
    actBox.innerHTML = "";

    if(locType === 'casa') {
        title.innerText = "Sua Casa";
        text.innerText = "Um lugar seguro e aconchegante. Você pode descansar aqui para recuperar todo o seu HP.";
        actBox.innerHTML = `<button onclick="healPlayer()" style="padding:10px 20px; background:#27ae60; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:5px;">Dormir (Recuperar HP / Passar 1 Dia)</button>`;
    } 
    else if(locType === 'quartel') {
        title.innerText = "Quartel General (Treinamento)";
        text.innerText = "O mestre de armas olha para você. 'Treinamento custa tempo e ouro. O que deseja aprimorar?'";
        
        let html = `<div style="display:flex; flex-direction:column; gap:10px; max-width: 450px; margin: 15px auto;">`;
        
        for(let k in window.STAT_MAP.base) {
            let currentLvl = window.activePlayer.base_stats[k];
            let currentXp = window.playerStatExp[k] || 0;
            let reqXp = window.getXpRequired(currentLvl);
            let statName = window.STAT_MAP.base[k];
            
            html += `
                <div style="background:#222; padding:15px; border-radius:5px; border:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:left; flex:1; margin-right:15px;">
                        <strong style="color:#3498db;">${statName} (Lvl ${currentLvl})</strong>
                        <div style="width:100%; background:#111; height:8px; border-radius:4px; margin-top:5px; overflow:hidden; border:1px solid #000;">
                            <div style="width:${(currentXp/reqXp)*100}%; background:#2ecc71; height:100%;"></div>
                        </div>
                        <small style="color:#bdc3c7;">XP: ${currentXp} / ${reqXp}</small>
                    </div>
                    <button onclick="trainStat('${k}')" style="padding:10px; background:#e67e22; border:none; color:#fff; border-radius:3px; cursor:pointer; font-weight:bold; font-size:0.85em;">
                        Treinar<br>(1 Dia / 20 Ouro)
                    </button>
                </div>
            `;
        }
        html += `</div>`;
        actBox.innerHTML = html;
    }
    else if(locType === 'centro') {
        title.innerText = "Praça Central";
        text.innerText = "Mercadores gritam promovendo novos armamentos. O vento traz cheiro de pão fresco.";
    }
    else if(locType === 'bar') {
        title.innerText = "Taverna do Javali";
        text.innerText = "Ouvindo as conversas, você descobre que as cavernas estão cheias de monstros ricos em Ouro e Equipamentos.";
    }
}

async function healPlayer() {
    if(window.activePlayer && window.playerFullStats) {
        
        window.playerHP = window.playerFullStats.computed.hp; 
        
        // AVANÇA 1 DIA AO DORMIR
        window.playerDays += 1; 
        
        // Atualiza a barrinha inferior da UI
        const daysEl = document.getElementById('session-days');
        if (daysEl) daysEl.innerText = `Dia: ${window.playerDays}`;
        
        // Salva tudo no banco de dados para garantir
        await window.saveGameState(); 
        
        alert("Você dormiu profundamente. HP completamente restaurado!\n1 Dia se passou.");
    } else {
        alert("Erro ao ler os status do personagem.");
    }
}

window.trainStat = async function(statKey) {
    const COST = 20;
    const XP_GAIN = 50; // Cada treino dá 50 de experiência
    
    if (window.playerGold < COST) {
        alert("Você não tem ouro suficiente! Custo: " + COST + " moedas.");
        return;
    }
    
    // Desconta ouro e avança o tempo
    window.playerGold -= COST;
    window.playerDays += 1;
    
    // Atualiza barra do menu da cidade
    const statusEl = document.getElementById('session-status');
    if (statusEl) statusEl.innerText = `Herói: ${window.activePlayer.name} | Ouro: ${window.playerGold}`;
    
    const daysEl = document.getElementById('session-days');
    if (daysEl) daysEl.innerText = `Dia: ${window.playerDays}`;
    
    // Adiciona o XP e verifica o Level Up
    let statName = window.STAT_MAP.base[statKey];
    let leveledUp = await window.addStatExp(statKey, XP_GAIN);
    
    let msg = `Você treinou ${statName} por 1 dia e gastou 20 moedas.\nGanhou ${XP_GAIN} XP!`;
    if (leveledUp) {
        msg += `\n\nPARABÉNS! Seu nível de ${statName} aumentou para ${window.activePlayer.base_stats[statKey]}!\nSua vida e dano foram melhorados!`;
    }
    alert(msg);
    
    // Recarrega a tela do quartel para mostrar a barra de XP atualizada e garantir que se a vida/dano subir, atualize a UI
    goToLocation('quartel'); 
};