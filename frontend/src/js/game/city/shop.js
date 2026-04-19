// frontend/src/js/game/city/shop.js
// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE LOJA (MERCADO)
// Depende de: globals.js, game_city.js (setView / backToCity), inventory.js (showTooltip)
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ─── Cache local do dia de loja (evita chamadas desnecessárias) ─────────────
let _shopItems = [];   // array de itens do dia atual
let _shopDayCache = -1;   // days_passed em que o cache foi gerado

// ─── Mapa de tipos legível ───────────────────────────────────────────────────
const SHOP_TYPE_LABEL = { equip: 'Equipamento', cons: 'Consumível' };

// ─── Pesos de preço (espelho do backend — só para tooltip) ──────────────────
const STAT_PRICE_WEIGHTS = {
    for: 50, int: 50, des: 50, car: 50, res: 50,
    hp: 1.5, mana: 1.5, stamina: 1.5,
    phys_dmg: 15, mag_dmg: 15, phys_res: 15, mag_res: 15,
    crit_rate: 30, crit_dmg: 10,
};

// ═══════════════════════════════════════════════════════════════════════════
// ABERTURA DA LOJA
// ═══════════════════════════════════════════════════════════════════════════
window.openShop = async function () {
    AudioManager.playSFX('open_menu');
    if (!window.activePlayer) {
        return window.showToast('Nenhum personagem ativo!', 'error');
    }

    setView('shop-screen');
    _renderShopLoading();

    try {
        const data = await window.pywebview.api.get_shop_inventory(window.activeSaveId);

        _shopItems = data.items || [];
        window.playerGold = data.player_gold ?? window.playerGold;
        window.updateHUD();

        // Cacheia dia atual
        _shopDayCache = window.playerDays;

        _renderShop();
    } catch (err) {
        console.error('[Shop] Erro ao carregar loja:', err);
        _renderShopError();
    }
};

// ─── Refresh sem fechar a loja (pós-compra) ──────────────────────────────────
function _refreshShopUI() {
    _renderShop();
    window.updateHUD();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPRA DE ITEM
// ═══════════════════════════════════════════════════════════════════════════
window.buyShopItem = async function (itemIndex) {
    const item = _shopItems[itemIndex];
    if (!item) return;
    if (item.sold) return window.showToast('Este item já foi vendido!', 'error');

    if (window.playerGold < item.price) {
        return window.showToast(`Ouro insuficiente! Precisa de ${item.price}🪙.`, 'error');
    }

    // Confirmação rápida via toast + disable do botão antes da chamada
    const btn = document.getElementById(`shop-buy-btn-${itemIndex}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Comprando...'; }

    try {
        const res = await window.pywebview.api.buy_shop_item(window.activeSaveId, itemIndex);

        if (res.status === 'success') {
            AudioManager.playSFX('buy_item');
            _shopItems[itemIndex].sold = true;
            window.playerGold = res.new_gold;
            window.playerInventory = res.new_inventory;

            window.showToast(res.message, 'success');
            _refreshShopUI();
        } else {
            AudioManager.playSFX('error');
            window.showToast(res.message, 'error');
            if (btn) { btn.disabled = false; btn.textContent = `Comprar ${item.price}🪙`; }
        }
    } catch (err) {
        console.error('[Shop] Erro na compra:', err);
        window.showToast('Erro ao processar compra.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = `Comprar ${item.price}🪙`; }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
function _renderShop() {
    const el = document.getElementById('shop-content');
    if (!el) return;

    const cal = window.getCalendarFromDays ? window.getCalendarFromDays(window.playerDays) : {};
    const dateStr = cal.day
        ? `${String(cal.day).padStart(2, '0')}/${String(cal.month).padStart(2, '0')} — Ano ${cal.year}`
        : `Dia ${window.playerDays}`;

    el.innerHTML = `
        <!-- ── CABEÇALHO ───────────────────────────────────────────────── -->
        <div class="shop-header">
            <div class="shop-header-left">
                <h2 class="shop-title">🏪 Mercado Ambulante</h2>
                <p class="shop-subtitle">Estoque do dia: <strong>${dateStr}</strong></p>
            </div>
            <div class="shop-header-right">
                <div class="shop-gold-display">
                    🪙 <span id="shop-gold-amount">${window.playerGold}</span>
                </div>
                <p class="shop-refresh-hint">⏳ Renova a cada amanhecer</p>
            </div>
        </div>

        <!-- ── GRID DE ITENS ──────────────────────────────────────────── -->
        <div class="shop-grid" id="shop-items-grid">
            ${_shopItems.length === 0
            ? '<p class="shop-empty">O mercador não tem nada para vender hoje.</p>'
            : _shopItems.map(_buildItemCard).join('')
        }
        </div>

        <!-- ── RODAPÉ ────────────────────────────────────────────────── -->
        <div class="shop-footer">
            <button class="shop-back-btn" onclick="backToCity()">⬅ Voltar à Cidade</button>
        </div>
    `;
}

// ─── Monta HTML de um card ───────────────────────────────────────────────────
function _buildItemCard(item, idx) {
    const sold = item.sold;
    const affordable = !sold && window.playerGold >= item.price;
    const cardClass = `shop-item-card ${sold ? 'shop-sold' : ''} ${!affordable && !sold ? 'shop-cant-afford' : ''}`;

    const imgSrc = item.img || 'assets/no_image.png';
    const modHtml = _buildModHtml(item);
    const btnText = sold ? '☠ Esgotado' : `Comprar ${item.price}🪙`;
    const btnClass = sold ? 'shop-buy-btn sold' : (affordable ? 'shop-buy-btn' : 'shop-buy-btn cant-afford');

    return `
    <div class="${cardClass}"
         onmouseenter="_shopShowTooltip(${idx}, event)"
         onmouseleave="_shopHideTooltip()">

        <div class="shop-item-badge">${SHOP_TYPE_LABEL[item.type] || item.type}</div>

        <div class="shop-item-img-wrap">
            <img src="${imgSrc}"
                 onerror="this.src='assets/no_image.png'"
                 class="shop-item-img"
                 alt="${item.name}">
            ${sold ? '<div class="shop-sold-overlay">ESGOTADO</div>' : ''}
        </div>

        <div class="shop-item-info">
            <strong class="shop-item-name">${item.name}</strong>
            ${modHtml}
        </div>

        <div class="shop-item-footer">
            <span class="shop-item-price ${sold ? 'price-sold' : ''}">
                ${sold ? '—' : `🪙 ${item.price}`}
            </span>
            <button id="shop-buy-btn-${idx}"
                    class="${btnClass}"
                    onclick="buyShopItem(${idx})"
                    ${sold ? 'disabled' : ''}
                    ${!sold && !affordable ? 'title="Ouro insuficiente"' : ''}>
                ${btnText}
            </button>
        </div>
    </div>`;
}

// ─── Linha de modificadores (equipamento) ou efeito (consumível) ─────────────
function _buildModHtml(item) {
    if (item.type === 'cons') {
        const label = item.effect_type === 'heal_hp' ? '❤ Cura de Vida' : item.effect_type || 'Efeito';
        return `<div class="shop-mod-list">
            <span class="shop-mod-row"><span>${label}</span>
            <strong class="mod-positive">+${item.effect_value}</strong></span>
        </div>`;
    }

    const mods = item.mods || {};
    const rows = Object.entries(mods)
        .filter(([, v]) => parseFloat(v) !== 0)
        .slice(0, 5)    // máx 5 stats no card (o resto fica no tooltip)
        .map(([k, v]) => {
            const val = parseFloat(v);
            const name = (window.STAT_MAP?.base[k] || window.STAT_MAP?.derived[k] || k);
            const sign = val > 0 ? '+' : '';
            const cls = val > 0 ? 'mod-positive' : 'mod-negative';
            return `<span class="shop-mod-row">
                <span>${name}</span>
                <strong class="${cls}">${sign}${val}</strong>
            </span>`;
        }).join('');

    return rows
        ? `<div class="shop-mod-list">${rows}</div>`
        : `<div class="shop-mod-list"><span class="shop-mod-none">Sem modificadores</span></div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLTIP DA LOJA (independente do tooltip do inventário)
// ═══════════════════════════════════════════════════════════════════════════
function _shopShowTooltip(idx, event) {
    const item = _shopItems[idx];
    if (!item) return;

    let tooltip = document.getElementById('shop-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'shop-tooltip';
        tooltip.className = 'shop-tooltip';
        document.body.appendChild(tooltip);
    }

    let html = `<h3 class="stt-name">${item.name}</h3>
                <span class="stt-type">${SHOP_TYPE_LABEL[item.type] || item.type}</span>
                <hr class="stt-hr">`;

    if (item.type === 'equip') {
        const mods = item.mods || {};
        const entries = Object.entries(mods).filter(([, v]) => parseFloat(v) !== 0);
        if (entries.length === 0) {
            html += `<p class="stt-none">Sem modificadores.</p>`;
        } else {
            entries.forEach(([k, v]) => {
                const val = parseFloat(v);
                const name = (window.STAT_MAP?.base[k] || window.STAT_MAP?.derived[k] || k);
                const sign = val > 0 ? '+' : '';
                const cls = val > 0 ? 'stt-pos' : 'stt-neg';
                html += `<div class="stt-row"><span>${name}</span>
                         <strong class="${cls}">${sign}${val}</strong></div>`;
            });
        }
        html += `<hr class="stt-hr">`;
        html += `<div class="stt-price-row">💰 Valor: <strong>${item.price}🪙</strong></div>`;

        // Breakdown de preço (detalha de onde vem o valor)
        const breakdown = _buildPriceBreakdown(mods);
        if (breakdown) html += `<details class="stt-breakdown"><summary>Ver cálculo</summary>${breakdown}</details>`;

    } else {
        html += `<p>Efeito: <strong>${item.effect_type === 'heal_hp' ? 'Curar Vida' : item.effect_type}</strong></p>`;
        html += `<p>Valor: <strong class="stt-pos">+${item.effect_value}</strong></p>`;
        html += `<hr class="stt-hr">`;
        html += `<div class="stt-price-row">💰 Valor: <strong>${item.price}🪙</strong></div>`;
    }

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    _shopPositionTooltip(tooltip, event);
}

function _shopHideTooltip() {
    const t = document.getElementById('shop-tooltip');
    if (t) t.style.display = 'none';
}

window.addEventListener('mousemove', (e) => {
    const t = document.getElementById('shop-tooltip');
    if (t && t.style.display === 'block') _shopPositionTooltip(t, e);
});

function _shopPositionTooltip(tooltip, e) {
    let x = e.clientX + 18;
    let y = e.clientY + 18;
    if (x + 270 > window.innerWidth) x = window.innerWidth - 280;
    if (y + tooltip.offsetHeight + 10 > window.innerHeight)
        y = window.innerHeight - tooltip.offsetHeight - 10;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function _buildPriceBreakdown(mods) {
    const BASE = 15;
    let rows = `<div class="stt-breakdown-row"><span>Base</span><strong>${BASE}🪙</strong></div>`;
    let total = BASE;
    Object.entries(mods).forEach(([k, v]) => {
        const val = parseFloat(v);
        if (!val) return;
        const w = STAT_PRICE_WEIGHTS[k] || 5;
        const add = Math.abs(val) * w;
        total += add;
        const name = (window.STAT_MAP?.base[k] || window.STAT_MAP?.derived[k] || k);
        rows += `<div class="stt-breakdown-row"><span>${name} ×${Math.abs(val)}</span><strong>+${add.toFixed(0)}🪙</strong></div>`;
    });
    rows += `<div class="stt-breakdown-total"><span>Total</span><strong>${Math.round(total)}🪙</strong></div>`;
    return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADOS DE LOADING / ERRO
// ═══════════════════════════════════════════════════════════════════════════
function _renderShopLoading() {
    const el = document.getElementById('shop-content');
    if (el) el.innerHTML = `
        <div class="shop-loading">
            <div class="shop-loading-spinner"></div>
            <p>O mercador está organizando suas mercadorias...</p>
        </div>`;
}

function _renderShopError() {
    const el = document.getElementById('shop-content');
    if (el) el.innerHTML = `
        <div class="shop-error">
            <p>⚠ Não foi possível carregar a loja. Tente novamente.</p>
            <button onclick="openShop()">🔄 Tentar de Novo</button>
            <button onclick="backToCity()">⬅ Voltar</button>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO COM game_city.js — adicionar loja à cidade
// (Chame esta função após renderCityScreen ou em main.js)
// ═══════════════════════════════════════════════════════════════════════════
window.injectShopButton = function () {
    const actions = document.getElementById('city-actions');
    if (!actions || document.getElementById('city-shop-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'city-shop-btn';
    btn.className = 'city-location-btn';
    btn.innerHTML = '🏪 Mercado';
    btn.style.cssText = `
        padding:10px 18px; border:2px solid #f39c12; border-radius:8px;
        background:#1a1a1a; color:#f39c12; font-weight:bold;
        cursor:pointer; transition:all 0.2s; font-size:0.95rem;
    `;
    btn.onmouseenter = () => { btn.style.background = '#f39c12'; btn.style.color = '#111'; };
    btn.onmouseleave = () => { btn.style.background = '#1a1a1a'; btn.style.color = '#f39c12'; };
    btn.onclick = () => window.openShop();
    actions.appendChild(btn);
};