// frontend/src/js/game/city/tournament.js
// ══════════════════════════════════════════════════
// SISTEMA DE TORNEIO (COLISEU)
// Depende de: globals.js, combat_core.js, game_city.js
// ══════════════════════════════════════════════════

const TOURNAMENT_CATEGORY_CONFIG = {
    novato:        { label: 'Novato',        icon: '🥉', entry: 0,   prize: 1000,   color: '#2ecc71', min: 0,   max: 50   },
    intermediario: { label: 'Intermediário', icon: '🥈', entry: 500,   prize: 5000,   color: '#3498db', min: 51,  max: 150  },
    avancado:      { label: 'Avançado',      icon: '🥇', entry: 2000,  prize: 25000,  color: '#e67e22', min: 151, max: 400  },
    lendario:      { label: 'Lendário',      icon: '👑', entry: 10000, prize: 150000, color: '#9b59b6', min: 401, max: 99999 },
};

const ROUND_NAMES =['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];

// ══════════════════════════════════════════════════
// ABERTURA DO COLISEU
// ══════════════════════════════════════════════════
window.openColiseum = async function() {
    if (!window.activePlayer) return alert('Selecione um personagem ativo!');

    const status = await window.pywebview.api.get_tournament_status(window.activeSaveId);
    const calInfo = await window.pywebview.api.get_calendar_info(window.activeSaveId);

    // Primeiro CRIA E INJETA o elemento na tela, só depois ativa ele com setView
    _renderColiseumMain(status, calInfo);
    setView('coliseum-screen');
};

function _renderColiseumMain(status, calInfo) {
    let el = document.getElementById('coliseum-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'coliseum-screen';
        el.className = 'game-view';
        document.getElementById('game-tab').appendChild(el);
    }

    const isSunday   = status?.is_sunday;
    const alreadyPlayed = status?.already_played;
    const playerPower = window.getPlayerPowerScore?.() || 0;

    el.innerHTML = `
    <div class="coliseum-wrapper">
        <!-- HEADER -->
        <div class="coliseum-header">
            <h1>🏟️ Coliseu</h1>
            <p style="color:#bdc3c7; margin:0;">
                ${isSunday
                    ? (alreadyPlayed
                        ? '⚠️ O torneio desta semana já foi disputado.'
                        : '🎉 Hoje é Domingo! O torneio está aberto!')
                    : `Os torneios acontecem aos Domingos. Hoje é ${calInfo?.day_of_week || '?'}.`}
            </p>
            <p style="color:#7f8c8d; font-size:0.85rem; margin:4px 0 0 0;">
                Seu poder: <strong style="color:#f1c40f;">${playerPower}</strong>
            </p>
        </div>

        <!-- ABAS -->
        <div style="display:flex; gap:8px; margin:15px 0;">
            <button class="coliseum-tab-btn active" id="ctab-enter" onclick="coliseumTab('enter')">⚔️ Entrar</button>
            <button class="coliseum-tab-btn"          id="ctab-hof"   onclick="coliseumTab('hof')">🏆 Hall da Fama</button>
        </div>

        <!-- TAB: ENTRAR -->
        <div id="coliseum-tab-enter">
            <div class="coliseum-categories">
                ${Object.entries(TOURNAMENT_CATEGORY_CONFIG).map(([key, cfg]) => {
                    const canEnter = isSunday && !alreadyPlayed && window.playerGold >= cfg.entry;
                    const affordable = window.playerGold >= cfg.entry;
                    return `
                    <div class="coliseum-category-card" style="border-color:${cfg.color};">
                        <div class="cc-icon">${cfg.icon}</div>
                        <h3 style="color:${cfg.color}; margin:0 0 8px 0;">${cfg.label}</h3>
                        <div class="cc-info">
                            <span>⚡ Faixa de poder:</span>
                            <strong>${cfg.min}–${cfg.max === 99999 ? '∞' : cfg.max}</strong>
                        </div>
                        <div class="cc-info">
                            <span>🪙 Inscrição:</span>
                            <strong style="color:${affordable ? '#2ecc71' : '#e74c3c'};">${cfg.entry.toLocaleString()}</strong>
                        </div>
                        <div class="cc-info">
                            <span>🎁 Prêmio:</span>
                            <strong style="color:#f1c40f;">${cfg.prize.toLocaleString()}</strong>
                        </div>
                        <button
                            class="cc-enter-btn"
                            style="background:${canEnter ? cfg.color : '#555'}; cursor:${canEnter ? 'pointer':'not-allowed'};"
                            onclick="${canEnter ? `enterTournament('${key}')` : 'void(0)'}"
                            ${canEnter ? '' : 'disabled'}
                        >
                            ${!isSunday ? '🔒 Só aos Domingos' :
                              alreadyPlayed ? '✅ Já participou hoje' :
                              !affordable ? '❌ Ouro insuficiente' : '⚔️ Participar'}
                        </button>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- TAB: HALL DA FAMA -->
        <div id="coliseum-tab-hof" style="display:none;">
            <div id="hof-content">
                <p style="color:#7f8c8d; text-align:center; padding:20px;">Carregando Hall da Fama...</p>
            </div>
        </div>

        <button onclick="backToCity()" class="cc-back-btn">⬅ Voltar à Cidade</button>
    </div>

    <!-- MODAL DE VITÓRIA DO TORNEIO -->
    <div id="tournament-victory-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
        z-index:9999; justify-content:center; align-items:center;">
        <div style="background:#1a1a2e; border:2px solid #f1c40f; border-radius:12px; padding:40px;
            text-align:center; max-width:450px; width:90%;">
            <div style="font-size:4rem; margin-bottom:15px;">🏆</div>
            <h2 style="color:#f1c40f; font-family:serif; font-size:2rem; margin-bottom:10px;">CAMPEÃO!</h2>
            <p id="tv-desc" style="color:#bdc3c7; margin-bottom:20px;"></p>
            <div id="tv-prize" style="font-size:1.5rem; color:#2ecc71; font-weight:bold; margin-bottom:25px;"></div>
            <button onclick="closeTournamentVictory()" style="background:#f1c40f; border:none; padding:12px 30px;
                border-radius:8px; font-weight:bold; font-size:1rem; cursor:pointer; color:#1a1a2e;">
                Continuar
            </button>
        </div>
    </div>

    <!-- INJEÇÃO DE ESTILOS -->
    <style>
    .coliseum-wrapper { padding:20px; max-width:900px; margin:0 auto; }
    .coliseum-header  { text-align:center; margin-bottom:10px; }
    .coliseum-header h1 { color:#f1c40f; font-family:serif; font-size:2.2rem; margin:0 0 6px 0; }
    .coliseum-tab-btn {
        padding:8px 18px; border:1px solid #444; background:#222; color:#bdc3c7;
        border-radius:6px; cursor:pointer; font-weight:bold; transition:0.15s;
    }
    .coliseum-tab-btn.active { background:#f1c40f; color:#1a1a2e; border-color:#f1c40f; }
    .coliseum-categories {
        display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px;
    }
    .coliseum-category-card {
        background:#1e1e2e; border:2px solid #444; border-radius:10px;
        padding:18px; display:flex; flex-direction:column; align-items:center; gap:6px;
        transition:transform 0.15s;
    }
    .coliseum-category-card:hover { transform:translateY(-2px); }
    .cc-icon  { font-size:2.5rem; }
    .cc-info  { display:flex; justify-content:space-between; width:100%;
        font-size:0.85rem; color:#bdc3c7; }
    .cc-enter-btn {
        margin-top:8px; width:100%; padding:10px; border:none;
        border-radius:6px; color:#fff; font-weight:bold; font-size:0.9rem;
        transition:opacity 0.15s;
    }
    .cc-enter-btn:not(:disabled):hover { opacity:0.85; }
    .cc-back-btn {
        margin-top:20px; background:#444; border:none; padding:10px 25px;
        border-radius:6px; color:#fff; cursor:pointer; font-weight:bold;
    }
    /* Chaveamento */
    .bracket-container { display:flex; gap:20px; overflow-x:auto; padding:10px; }
    .bracket-round     { display:flex; flex-direction:column; gap:12px; min-width:160px; }
    .bracket-round h4  { color:#f1c40f; text-align:center; margin:0 0 8px 0; font-size:0.85rem; }
    .bracket-match     { background:#21262d; border:1px solid #30363d; border-radius:6px; padding:8px 10px; }
    .bracket-match.player-match { border-color:#f1c40f; }
    .bracket-match-name { font-size:0.8rem; color:#bdc3c7; padding:3px 0; }
    .bracket-match-name.player-name { color:#f1c40f; font-weight:bold; }
    .bracket-match-name.winner-name { color:#2ecc71; }
    /* Hall da Fama */
    .hof-tabs { display:flex; gap:8px; margin-bottom:15px; }
    .hof-tab-btn { padding:6px 14px; border:1px solid #444; background:#222; color:#bdc3c7;
        border-radius:5px; cursor:pointer; font-size:0.85rem; }
    .hof-tab-btn.active { background:#9b59b6; color:#fff; border-color:#9b59b6; }
    .hof-table { width:100%; border-collapse:collapse; }
    .hof-table th { background:#1e1e2e; color:#f1c40f; padding:8px 12px;
        text-align:left; font-size:0.85rem; border-bottom:1px solid #333; }
    .hof-table td { padding:8px 12px; border-bottom:1px solid #222; font-size:0.85rem; color:#bdc3c7; }
    .hof-table tr:hover td { background:#1e1e2e; }
    .hof-player-row td { color:#f1c40f; }
    </style>
    `;
}

// ══════════════════════════════════════════════════
// ABAS DO COLISEU
// ══════════════════════════════════════════════════
window.coliseumTab = function(tab) {
    document.querySelectorAll('.coliseum-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ctab-${tab}`).classList.add('active');
    document.getElementById('coliseum-tab-enter').style.display = tab === 'enter' ? '' : 'none';
    document.getElementById('coliseum-tab-hof').style.display   = tab === 'hof'   ? '' : 'none';
    if (tab === 'hof') _loadHallOfFame();
};

// ══════════════════════════════════════════════════
// HALL DA FAMA
// ══════════════════════════════════════════════════
async function _loadHallOfFame() {
    const hofEl = document.getElementById('hof-content');
    hofEl.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Carregando...</p>';

    const data = await window.pywebview.api.get_hall_of_fame(window.activeSaveId);

    let currentCat = 'novato';
    function renderHOF(cat) {
        currentCat = cat;
        const entries = data[cat] || [];
        const cfg = TOURNAMENT_CATEGORY_CONFIG[cat];
        if (!entries.length) {
            return `<p style="color:#7f8c8d;text-align:center;padding:20px;">
                Nenhum campeão registrado ainda na categoria ${cfg.label}.
            </p>`;
        }
        return `
        <table class="hof-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Campeão</th>
                    <th>Vitórias</th>
                    <th>Ouro Total</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map((e, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`;
                    const isPlayer = !!e.is_player;
                    return `<tr class="${isPlayer ? 'hof-player-row' : ''}">
                        <td>${medal}</td>
                        <td>${e.winner_name}${isPlayer ? ' 👤' : ''}</td>
                        <td>${e.wins}</td>
                        <td>🪙 ${(e.total_gold || 0).toLocaleString()}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    hofEl.innerHTML = `
    <div class="hof-tabs">
        ${Object.entries(TOURNAMENT_CATEGORY_CONFIG).map(([key, cfg]) =>
            `<button class="hof-tab-btn ${key === 'novato' ? 'active' : ''}"
                id="hof-btn-${key}" onclick="switchHOFTab('${key}')">${cfg.icon} ${cfg.label}</button>`
        ).join('')}
    </div>
    <div id="hof-table-wrapper">${renderHOF('novato')}</div>`;

    window.switchHOFTab = function(cat) {
        document.querySelectorAll('.hof-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`hof-btn-${cat}`).classList.add('active');
        document.getElementById('hof-table-wrapper').innerHTML = renderHOF(cat);
    };
}

// ══════════════════════════════════════════════════
// ENTRAR NO TORNEIO
// ══════════════════════════════════════════════════
window.enterTournament = async function(category) {
    const cfg = TOURNAMENT_CATEGORY_CONFIG[category];
    if (!cfg) return;

    if (window.playerGold < cfg.entry) {
        return window.showToast(`Ouro insuficiente! Você precisa de ${cfg.entry} moedas.`, 'error');
    }

    // Desconta a inscrição
    window.playerGold -= cfg.entry;
    window.updateHUD();

    // Busca os 15 oponentes do backend
    const res = await window.pywebview.api.get_tournament_opponents(window.activeSaveId, category);
    if (!res || res.status !== 'ok') {
        window.playerGold += cfg.entry; // devolve
        window.updateHUD();
        return window.showToast('Erro ao buscar oponentes. Tente novamente.', 'error');
    }

    const opponents = res.opponents;

    // Monta o chaveamento de 16 (player + 15 NPCs)
    // Rodada 0: Oitavas (8 confrontos) — player vê apenas o próprio bracket
    // Para simplificar: o player enfrenta 4 oponentes (1 por rodada)
    // Os outros 14 têm seus resultados simulados no backend
    // Selecionamos 1 oponente por rodada (índices 0,1,2,3)
    const bracketOpponents = opponents.slice(0, 4);

    // Configura estado global do torneio
    window._tournamentData = {
        category,
        opponents: bracketOpponents,
        currentRound: 0,
        currentOpponentIndex: 0,
        prize: cfg.prize,
    };

    // Mostra tela de chaveamento antes de entrar
    _showBracketPreview(category, cfg, bracketOpponents, opponents.slice(4));
};

// ══════════════════════════════════════════════════
// PRÉVIA DO CHAVEAMENTO
// ══════════════════════════════════════════════════
function _showBracketPreview(category, cfg, playerOpponents, restNpcs) {
    let previewEl = document.getElementById('bracket-preview-screen');
    if (!previewEl) {
        previewEl = document.createElement('div');
        previewEl.id = 'bracket-preview-screen';
        previewEl.className = 'game-view';
        document.getElementById('game-tab').appendChild(previewEl);
    }

    const playerPower = window.getPlayerPowerScore?.() || 0;

    previewEl.innerHTML = `
    <div style="padding:20px; max-width:900px; margin:0 auto;">
        <h2 style="color:#f1c40f; font-family:serif; text-align:center;">
            ${cfg.icon} Torneio ${cfg.label} — Chaveamento
        </h2>
        <p style="color:#bdc3c7; text-align:center; margin-bottom:20px;">
            Você disputará 4 rodadas. Entre cada rodada, seu HP/MP/SP é recuperado.
        </p>

        <div class="bracket-container">
            ${ROUND_NAMES.map((roundName, ri) => `
            <div class="bracket-round">
                <h4>${roundName}</h4>
                ${ri < playerOpponents.length ? `
                <div class="bracket-match player-match">
                    <div class="bracket-match-name player-name">
                        ⚔️ ${window.activePlayer.name} (${playerPower})
                    </div>
                    <div style="color:#555; font-size:0.7rem; text-align:center;">vs</div>
                    <div class="bracket-match-name">
                        ${playerOpponents[ri]?.name || '?'} (${playerOpponents[ri]?.power_score || '?'})
                    </div>
                </div>` : `
                <div class="bracket-match" style="opacity:0.5; border-style:dashed;">
                    <div class="bracket-match-name" style="color:#555; text-align:center;">
                        A ser disputado
                    </div>
                </div>`}
            </div>`).join('')}
        </div>

        <div style="background:#1e1e2e; border:1px solid #333; border-radius:8px; padding:15px; margin-top:20px; text-align:center;">
            <p style="color:#bdc3c7; margin:0 0 8px 0;">
                🎁 Prêmio pelo título: <strong style="color:#f1c40f;">${cfg.prize.toLocaleString()} moedas</strong>
            </p>
            <p style="color:#7f8c8d; font-size:0.85rem; margin:0;">
                ⚠️ Se for derrotado, não perderá ouro — mas será eliminado do torneio.
            </p>
        </div>

        <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
            <button onclick="startTournamentCombat()" style="
                background:#e74c3c; border:none; padding:12px 30px; border-radius:8px;
                color:#fff; font-weight:bold; font-size:1rem; cursor:pointer;">
                ⚔️ Começar o Torneio!
            </button>
            <button onclick="cancelTournamentEntry('${category}', ${cfg.entry})" style="
                background:#555; border:none; padding:12px 20px; border-radius:8px;
                color:#fff; cursor:pointer;">
                Cancelar (Reembolso)
            </button>
        </div>
    </div>`;

    setView('bracket-preview-screen');
}

window.startTournamentCombat = function() {
    window.combatContext = 'tournament';
    window.enterTournamentBattle();
};

window.cancelTournamentEntry = function(category, entryFee) {
    window.playerGold += entryFee;
    window.updateHUD();
    window.openColiseum();
};

// ══════════════════════════════════════════════════
// MODAL DE VITÓRIA DO TORNEIO
// ══════════════════════════════════════════════════
window.showTournamentVictoryModal = function(prize, category) {
    const cfg = TOURNAMENT_CATEGORY_CONFIG[category] || {};
    const modal = document.getElementById('tournament-victory-modal');
    if (!modal) { backToCity(); return; }

    document.getElementById('tv-desc').innerText =
        `Você venceu o Torneio ${cfg.label || category}! ` +
        `Parabéns, ${window.activePlayer.name}!`;
    document.getElementById('tv-prize').innerText =
        `🪙 +${prize.toLocaleString()} moedas de ouro!`;

    modal.style.display = 'flex';
};

window.closeTournamentVictory = function() {
    const modal = document.getElementById('tournament-victory-modal');
    if (modal) modal.style.display = 'none';
    window.openColiseum();
};