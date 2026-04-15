window.addEventListener('pywebviewready', async function() {
    console.log("API Python Pronta.");
    await window.refreshData();
});

window.refreshData = async function() {
    console.log("Solicitando dados ao Banco...");
    try {
        window.gameData = await window.pywebview.api.load_data();
        console.log("Dados recebidos:", window.gameData);

        // Atualiza Dropdown da Cidade (quem o jogador controla)
        const selCity = document.getElementById('active-character-select');
        if (selCity) {
            const currentVal = selCity.value;
            selCity.innerHTML = '<option value="">-- Selecionar Herói --</option>';
            window.gameData.characters.forEach(c => {
                selCity.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            selCity.value = currentVal;
        }

        // Atualiza os dropdowns da tela de Montagem de Personagem
        if (typeof buildSelects === "function") {
            buildSelects();
        }

        // Atualiza tabela do CRUD se estiver nela
        if (typeof renderCrudTable === "function") {
            renderCrudTable();
        }

    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
};

window.showTab = function(tabId, btnElement) {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Mostra a selecionada
    document.getElementById(tabId).classList.add('active');
    
    // Estilo dos botões
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Toda vez que mudar de aba, atualizamos os dados para garantir que itens novos apareçam
    window.refreshData();

    // Lógicas específicas de aba
    if (tabId === 'game-tab' && typeof updateCityUI === "function") {
        updateCityUI();
    }
};