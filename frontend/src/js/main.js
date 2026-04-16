// frontend/src/js/main.js

let isHtmlLoaded = false;
let isApiReady = false;

// 1. Carrega os pedaços de HTML assim que a tela abre
window.addEventListener('DOMContentLoaded', async () => {
    const pages =[
        { id: 'menu-tab', file: 'src/pages/menu.html' },
        { id: 'game-tab', file: 'src/pages/game.html' },
        { id: 'admin-tab', file: 'src/pages/forge.html' },
        { id: 'char-tab', file: 'src/pages/builder.html' },
        { id: 'crud-tab', file: 'src/pages/database.html' }
    ];

    // Carrega as abas principais
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
    
    // 1.5. Injeta as sub-telas de Guilda
    try {
        // Tela In-Game da Guilda
        const guildRes = await fetch('src/pages/guild.html');
        if (guildRes.ok) {
            const guildScreen = document.getElementById('guild-screen');
            if (guildScreen) {
                guildScreen.innerHTML = await guildRes.text();
            }
        }
        
        // Tela de Criação da Guilda na Forja (Administração)
        const guildForgeRes = await fetch('src/pages/guild_forge.html');
        if (guildForgeRes.ok) {
            const adminTab = document.getElementById('admin-tab');
            if (adminTab) {
                // Anexa ao final dos formulários de forja existentes
                adminTab.insertAdjacentHTML('beforeend', await guildForgeRes.text());
            }
        }
    } catch(e) {
        console.error("Erro ao carregar arquivos de guilda:", e);
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
    
    // Injeta os dados nas abas correspondentes
    if (typeof loadMenuSaves === "function") loadMenuSaves();
    if (typeof buildSelects === "function") buildSelects();
    if (typeof renderCrudTable === "function") renderCrudTable();
    
    // Desenha as grids dinâmicas do STAT_MAP
    if (typeof window.renderForgeStats === "function") window.renderForgeStats();
    if (typeof updateLivePreview === "function") updateLivePreview();
}

// 5. Sistema de Navegação (Abas)
window.showTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    if (typeof buildSelects === "function") buildSelects();
};