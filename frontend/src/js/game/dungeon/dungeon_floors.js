// frontend/src/js/dungeon_floors.js

// ══════════════════════════════════════════════════
// TELA DE ENTRADA DA DUNGEON (escolher andar)
// ══════════════════════════════════════════════════
window.openDungeonEntrance = async function() {
    if (!window.activePlayer) return alert("Nenhum personagem ativo!");
    if (window.playerHP <= 0) return alert("Você está gravemente ferido! Vá descansar antes de explorar.");

    await syncDungeonInfo();
    renderDungeonEntrance();
    setView('dungeon-entrance-screen');
};

async function syncDungeonInfo() {
    const info = await window.pywebview.api.get_dungeon_info(window.activeSaveId);
    if (info) {
        window._dungeonMaxFloor     = info.max_floor;
        window._dungeonCurrentFloor = info.current_floor;
    } else {
        window._dungeonMaxFloor     = window._dungeonMaxFloor     || 1;
        window._dungeonCurrentFloor = window._dungeonCurrentFloor || 1;
    }
}

function renderDungeonEntrance() {
    const el = document.getElementById('dungeon-entrance-content');
    if (!el) return;

    const max = window._dungeonMaxFloor || 1;
    const cur = window._dungeonCurrentFloor || 1;

    // Calcula power score dos inimigos para mostrar perigo
    const floors = Array.from({ length: max }, (_, i) => i + 1);

    el.innerHTML = `
        <div class="dungeon-entrance-box">
            <h2 style="color:#e74c3c; font-family:serif; font-size:2rem; margin-bottom:5px;">💀 Entrada da Caverna</h2>
            <p style="color:#7f8c8d; margin-bottom:20px;">Andar máximo alcançado: <strong style="color:#f1c40f;">Andar ${max}</strong></p>

            <div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap; justify-content:center;">
                <div class="floor-info-card">
                    <span style="font-size:2rem;">⚔️</span>
                    <span>Continuar do andar <strong style="color:#f39c12;">${cur}</strong></span>
                    <button onclick="startDungeonAtFloor(${cur})" style="background:#e74c3c; border:none; padding:10px 20px; border-radius:5px; color:#fff; font-weight:bold; cursor:pointer; margin-top:8px;">Entrar (Andar ${cur})</button>
                </div>
                <div class="floor-info-card">
                    <span style="font-size:2rem;">🏁</span>
                    <span>Recomeçar do <strong style="color:#2ecc71;">Andar 1</strong></span>
                    <button onclick="startDungeonAtFloor(1)" style="background:#27ae60; border:none; padding:10px 20px; border-radius:5px; color:#fff; font-weight:bold; cursor:pointer; margin-top:8px;">Começar do Zero</button>
                </div>
            </div>

            <h3 style="color:#bdc3c7; margin-bottom:10px; border-top:1px solid #333; padding-top:15px;">Andares Desbloqueados</h3>
            <div id="floor-selector" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; max-height:150px; overflow-y:auto; padding:5px;">
                ${floors.map(f => {
                    const danger = getDangerLabel(f);
                    return `<button class="floor-btn" onclick="startDungeonAtFloor(${f})" 
                        style="background:${cur===f ? '#e67e22' : '#222'}; border:1px solid ${danger.color}; padding:6px 12px; border-radius:4px; color:${danger.color}; cursor:pointer; font-weight:bold; transition:0.15s;"
                        title="${danger.label}">
                        ${f} <span style="font-size:0.7em;">${danger.icon}</span>
                    </button>`;
                }).join('')}
            </div>

            <button onclick="backToCity()" style="background:#555; border:none; padding:10px 25px; border-radius:5px; color:#fff; cursor:pointer; margin-top:20px; font-weight:bold;">⬅ Voltar à Cidade</button>
        </div>
    `;
}

function getDangerLabel(floor) {
    if (floor <= 3)  return { label:'Fácil',    icon:'⭐',  color:'#2ecc71' };
    if (floor <= 7)  return { label:'Médio',    icon:'⚠️',  color:'#f1c40f' };
    if (floor <= 15) return { label:'Difícil',  icon:'🔥',  color:'#e67e22' };
    if (floor <= 25) return { label:'Épico',    icon:'💀',  color:'#e74c3c' };
    return             { label:'Lendário', icon:'👑',  color:'#9b59b6' };
}

window.startDungeonAtFloor = async function(floor) {
    window._dungeonCurrentFloor = floor;
    await window.pywebview.api.set_dungeon_floor(window.activeSaveId, floor, false);
    enterDungeon();
};

// ══════════════════════════════════════════════════
// AVANÇAR ANDAR APÓS VITÓRIA
// ══════════════════════════════════════════════════
window.advanceDungeonFloor = async function() {
    AudioManager.playSFX('floor_advance');
    const next = (window._dungeonCurrentFloor || 1) + 1;
    window._dungeonCurrentFloor = next;
    const isNewMax = next > (window._dungeonMaxFloor || 1);
    if (isNewMax) window._dungeonMaxFloor = next;
    await window.pywebview.api.set_dungeon_floor(window.activeSaveId, next, isNewMax);
    if (isNewMax) {
        showFloorUnlockBanner(next);
    }
};

function showFloorUnlockBanner(floor) {
    const el = document.getElementById('floor-unlock-banner');
    if (!el) return;
    el.innerHTML = `🎉 Novo Andar Desbloqueado! <strong style="color:#f1c40f;">Andar ${floor}</strong>`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ══════════════════════════════════════════════════
// POWER SCORE UI
// ══════════════════════════════════════════════════
window.getPlayerPowerScore = function() {
    if (!window.activePlayer) return 0;
    const base = window.activePlayer.base_stats || {};
    return Object.values(base).reduce((s, v) => s + (parseInt(v) || 0), 0);
};

window.renderPowerScoreHUD = function() {
    const el = document.getElementById('power-score-display');
    if (!el) return;
    const score = window.getPlayerPowerScore();
    const floor = window._dungeonCurrentFloor || 1;
    el.innerHTML = `⚡ Poder: <strong style="color:#f1c40f;">${score}</strong> | 📍 Andar: <strong style="color:#e74c3c;">${floor}</strong>`;
};