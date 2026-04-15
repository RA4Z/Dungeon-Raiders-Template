// Aguarda a API do Python estar 100% pronta para carregar os dados
window.addEventListener('pywebviewready', async function() {
    await refreshData();
});

// Acessa o Python para baixar tudo e popular os Dropdowns globais
window.refreshData = async function() {
    window.gameData = await window.pywebview.api.load_data();
    
    // Popula o Game UI (Seleção de quem você vai controlar na cidade)
    const selCity = document.getElementById('active-character-select');
    if(selCity) {
        const tempVal = selCity.value; // Salva pra não perder quem está equipado
        selCity.innerHTML = '<option value="">Selecione...</option>';
        window.gameData.characters.forEach(c => {
            // Permite jogar com humanos e monstros!
            selCity.innerHTML += `<option value="${c.id}">${c.name} (Atk: ${c.attack})</option>`;
        });
        if(tempVal && window.gameData.characters.find(c => c.id == tempVal)) selCity.value = tempVal;
    }

    // Chama funções de outros módulos que dependem desses dados:
    if (typeof buildSelects === "function") buildSelects(); // builder.js
    if (typeof renderCrudTable === "function") renderCrudTable(); // admin.js
}

// Navegação Visual do Aplicativo (Abas Superiores)
window.showTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    if (tabId === 'crud-tab') renderCrudTable();
    if (tabId === 'game-tab') updateCityUI(); 
}