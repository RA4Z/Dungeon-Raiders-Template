let isHtmlLoaded = false;
let isApiReady = false;

// 1. Carrega os pedaços de HTML assim que a tela abre
window.addEventListener('DOMContentLoaded', async () => {
    const pages =[
        { id: 'menu-tab', file: 'pages/menu.html' },
        { id: 'game-tab', file: 'pages/game.html' },
        { id: 'admin-tab', file: 'pages/forge.html' },
        { id: 'char-tab', file: 'pages/builder.html' },
        { id: 'crud-tab', file: 'pages/database.html' }
    ];

    for (let p of pages) {
        try {
            const res = await fetch(p.file);
            if(res.ok) {
                document.getElementById(p.id).innerHTML = await res.text();
            } else {
                console.error(`Falha ao carregar ${p.file}`);
            }
        } catch(e) {
            console.error(e);
        }
    }
    
    isHtmlLoaded = true;
    checkReady();
});

// 2. Aguarda a comunicação com o Python estar pronta
window.addEventListener('pywebviewready', () => {
    isApiReady = true;
    checkReady();
});

// 3. Quando TUDO estiver pronto, pede os dados ao banco
async function checkReady() {
    if (isHtmlLoaded && isApiReady) {
        await window.refreshData();
    }
}

// 4. Função global para buscar os dados no banco
window.refreshData = async function() {
    window.gameData = await window.pywebview.api.load_data();
    
    // Alimenta as telas que precisam dos dados imediatamente
    if (typeof loadMenuSaves === "function") loadMenuSaves();
    if (typeof buildSelects === "function") buildSelects();
    if (typeof renderCrudTable === "function") renderCrudTable();
}

// 5. Sistema de Navegação (Abas)
window.showTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Atualiza os dados sempre que mudar de tela
    if (isApiReady) window.refreshData();
};