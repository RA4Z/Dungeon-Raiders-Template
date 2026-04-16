function setView(viewId) {
    document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
}

function backToCity() {
    setView('city-screen');
}

function updateCityUI() {
    if (!window.activePlayer) {
        document.getElementById('active-character-select').style.border = "2px solid red";
    } else {
        document.getElementById('active-character-select').value = window.activePlayer.id;
        document.getElementById('active-character-select').style.border = "1px solid #777";
    }
}

function setActiveCharacter() {
    const id = document.getElementById('active-character-select').value;
    window.activePlayer = window.gameData.characters.find(c => c.id == id);
    if (window.activePlayer) {
        window.playerHP = window.activePlayer.hp;
        alert(`Personagem ${window.activePlayer.name} pronto para explorar!`);
        updateCityUI();
    }
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
        enterDungeon(); // game_combat.js
        return;
    }

    setView('location-screen');
    const title = document.getElementById('loc-title');
    const text = document.getElementById('loc-text');
    const actBox = document.getElementById('loc-actions');
    actBox.innerHTML = "";

    if (locType === 'casa') {
        title.innerText = "Sua Casa";
        text.innerText = "Um lugar seguro e aconchegante. Você pode descansar aqui para recuperar todo o seu HP.";
        actBox.innerHTML = `<button onclick="healPlayer()" style="padding:10px 20px; background:#27ae60; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:5px;">Dormir (Recuperar HP)</button>`;
    }
    else if (locType === 'quartel') {
        title.innerText = "Quartel General";
        text.innerText = "Soldados treinam intensamente. O comandante olha para você esperando que elimine as ameaças das Cavernas.";
    }
    else if (locType === 'centro') {
        title.innerText = "Praça Central";
        text.innerText = "Mercadores gritam promovendo novos armamentos. O vento traz cheiro de pão fresco.";
    }
    else if (locType === 'bar') {
        title.innerText = "Taverna do Javali";
        text.innerText = "Ouvindo as conversas, você descobre que as cavernas estão cheias de monstros ricos em Ouro e Equipamentos.";
    }
}

async function healPlayer() {
    if(window.activePlayer && window.playerFullStats) {
        
        // Pega o HP correto atualizado pela nova engine
        window.playerHP = window.playerFullStats.computed.hp; 
        
        // Salva no banco para não zerar ou dar null!
        if (typeof syncInventoryToDB === "function") {
            await syncInventoryToDB();
        }
        
        alert("Você dormiu profundamente. HP completamente restaurado!");
    } else {
        alert("Erro ao ler os status do personagem.");
    }
}