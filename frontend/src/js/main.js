// frontend/src/js/main.js

let isHtmlLoaded = false;
let isApiReady = false;

// 1. Carrega os pedaços de HTML assim que a tela abre
window.addEventListener('DOMContentLoaded', async () => {
    const pages = [
        { id: 'menu-tab',   file: 'src/pages/menu.html'     },
        { id: 'game-tab',   file: 'src/pages/game.html'     },
        { id: 'allies-tab', file: 'src/pages/allies.html'   },
        { id: 'admin-tab',  file: 'src/pages/forge.html'    },
        { id: 'char-tab',   file: 'src/pages/builder.html'  },
        { id: 'crud-tab',   file: 'src/pages/database.html' },
    ];

    for (let p of pages) {
        try {
            const res = await fetch(p.file);
            if (res.ok) {
                document.getElementById(p.id).innerHTML = await res.text();
            } else {
                console.error(`Falha ao carregar ${p.file}`);
            }
        } catch(e) {
            console.error(e);
        }
    }

    // Sub-telas de Guilda
    try {
        const guildRes = await fetch('src/pages/guild.html');
        if (guildRes.ok) {
            const guildScreen = document.getElementById('guild-screen');
            if (guildScreen) guildScreen.innerHTML = await guildRes.text();
        }

        const guildForgeRes = await fetch('src/pages/guild_forge.html');
        if (guildForgeRes.ok) {
            const adminTab = document.getElementById('admin-tab');
            if (adminTab) adminTab.insertAdjacentHTML('beforeend', await guildForgeRes.text());
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

    if (typeof loadMenuSaves    === "function") loadMenuSaves();
    if (typeof buildSelects     === "function") buildSelects();
    if (typeof renderCrudTable  === "function") renderCrudTable();
    if (typeof window.renderForgeStats === "function") window.renderForgeStats();
    if (typeof updateLivePreview === "function") updateLivePreview();
};

// 5. Sistema de Navegação (Abas)
window.showTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (typeof buildSelects === "function") buildSelects();

    // Atualiza o painel de aliados ao entrar na aba
    if (tabId === 'allies-tab' && typeof window.renderAlliesPanel === 'function') {
        window.renderAlliesPanel();
    }
};

// 6. Desbloqueio do botão de Aliados junto com o Jogo
// Chamado no loadGameSession do main_menu.js
const _origLoadGameSession = window.loadGameSession;
window.loadGameSession = async function(save) {
    await _origLoadGameSession?.(save);
    // Exibe botão de aliados
    const alliesBtn = document.getElementById('btn-tab-allies');
    if (alliesBtn) alliesBtn.style.display = 'block';
};