// frontend/src/js/game/dungeon/combat_scale.js

(function () {
    console.log('Combat scale script loaded (V2 - Dynamic Height)');

    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2.5;

    function apply() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // 1. Calcula a altura e largura da UI dinamicamente
        let uiH = 230;
        let hudW = 300;

        if (w <= 768) { uiH = 180; hudW = 180; }
        else if (w <= 1024) { uiH = 195; hudW = 210; }
        else if (w <= 1280) { uiH = 210; hudW = 240; }

        // 2. Calcula o espaço vertical LIVRE para os personagens
        const battleH = h - uiH;

        // O personagem base tem 250px. Queremos que ele ocupe no máximo 70% da tela de batalha.
        // O inimigo tem uma margem de baixo maior, então ele tem menos espaço (60%).
        const maxPlayerH = battleH * 0.70; 
        const maxEnemyH  = battleH * 0.60; 

        // 3. Define as escalas
        let ps = clamp(maxPlayerH / 250, MIN_SCALE, MAX_SCALE);
        let as = clamp(ps * 0.95, MIN_SCALE, MAX_SCALE); // Aliados ligeiramente menores
        let es = clamp(maxEnemyH / 250, MIN_SCALE, MAX_SCALE);

        const root = document.documentElement;
        root.style.setProperty('--combat-player-scale', ps.toFixed(3));
        root.style.setProperty('--combat-ally-scale',   as.toFixed(3));
        root.style.setProperty('--combat-enemy-scale',  es.toFixed(3));
        root.style.setProperty('--combat-ui-height',    uiH + 'px');
        root.style.setProperty('--combat-hud-width',    hudW + 'px');

        // Reposiciona os containers
        reposition(ps, as, es, w, hudW);
    }

    function reposition(ps, as, es, w, hudW) {
        const playerEl  = document.getElementById('player-container');
        const partyEl   = document.getElementById('party-battlefield-container');
        const enemiesEl = document.getElementById('enemies-battlefield-container');

        // Largura base das "bonecas" é 150px. Multiplicamos pela escala para saber o tamanho real.
        const playerActualWidth = 150 * ps;

        // O jogador fica na esquerda, dando um pequeno respiro da HUD lateral
        const playerLeft = hudW + (w * 0.02) + (playerActualWidth / 2);

        if (playerEl) {
            playerEl.style.left = playerLeft + 'px';
        }

        if (partyEl) {
            // A party é alinhada em pixels imediatamente ao lado direito do player
            partyEl.style.left = (playerLeft + (playerActualWidth / 2) + 20) + 'px';
        }

        if (enemiesEl) {
            // Os inimigos ficam ancorados na direita, antes da HUD inimiga
            enemiesEl.style.right = (hudW + (w * 0.02)) + 'px';
            // Impede que os inimigos invadam o lado esquerdo
            enemiesEl.style.maxWidth = (w - playerLeft - playerActualWidth - 50) + 'px';
        }
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function watchCombatScreen() {
        const el = document.getElementById('combat-screen');
        if (!el) return;
        const obs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.attributeName === 'class' && el.classList.contains('active-view')) {
                    requestAnimationFrame(() => requestAnimationFrame(apply));
                }
            });
        });
        obs.observe(el, { attributes: true, attributeFilter:['class'] });
    }

    let _t;
    window.addEventListener('resize', function () {
        clearTimeout(_t);
        _t = setTimeout(function () {
            const cs = document.getElementById('combat-screen');
            if (cs && cs.classList.contains('active-view')) apply();
        }, 100);
    });

    function init() {
        apply();
        watchCombatScreen();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();