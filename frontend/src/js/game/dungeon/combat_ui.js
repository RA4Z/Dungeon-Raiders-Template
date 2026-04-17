// frontend/src/js/combat_ui.js

window.combatTargetIndex = 0;

// ── Controle de modo de combate dos aliados ────────
// 'auto'   = aliados atacam automaticamente (comportamento original)
// 'manual' = jogador escolhe os ataques de cada aliado
window._allyControlMode = 'auto'; // padrão: automático

// Qual aliado está selecionado para controle manual
// null = nenhum (mostra hotbar do player)
window._activeCombatantControl = null; // 'player' | memberId

// ══════════════════════════════════════════════════
// RENDER DO PERSONAGEM NO CAMPO
// ══════════════════════════════════════════════════
window.buildBattleCharacter = async function (characterData, side, imgId, layersId) {
    const imgEl = imgId ? document.getElementById(imgId) : null;
    const layersEl = layersId ? document.getElementById(layersId) : null;
    if (!characterData) return;

    if (characterData.race === 'humano') {
        if (imgEl) imgEl.style.display = 'none';
        if (layersEl) { layersEl.style.display = 'block'; layersEl.innerHTML = ''; }

        let eqDataMap = typeof characterData.equipment_data === 'string'
            ? JSON.parse(characterData.equipment_data)
            : characterData.equipment_data;

        const gender = characterData._gender || characterData.gender || window.playerGender || 'male';

        // Loop com async/await adequado
        for (let i = 0; i < window.EQUIP_SLOTS.length; i++) {
            const slot = window.EQUIP_SLOTS[i];
            const itemId = eqDataMap[slot];

            if (itemId) {
                let itemData = slot === 'base'
                    ? window.gameData.bodies.find(b => b.id == itemId)
                    : window.gameData.equipments.find(e => e.id == itemId);

                if (itemData && layersEl) {
                    let img;
                    if (slot === 'base') {
                        img = typeof window.getBodyImage === 'function'
                            ? window.getBodyImage(itemData, side, gender)
                            : (side === 'f' ? itemData.img_front : itemData.img_back);

                        // APLICA O SHADER AQUI SE HOUVER COR DE PELE
                        if (eqDataMap.skin_color && eqDataMap.skin_color !== "#ffffff") {
                            if (typeof window.applyShaderTint === 'function') {
                                img = await window.applyShaderTint(img, eqDataMap.skin_color);
                            }
                        }
                    } else {
                        img = typeof window.getEquipImage === 'function'
                            ? window.getEquipImage(itemData, side, gender)
                            : (side === 'f' ? itemData.img_front : itemData.img_back);
                    }

                    if (img) {
                        layersEl.innerHTML += `<img src="${img}" style="z-index:${i}; position:absolute; width:100%; height:100%; object-fit:contain;">`;
                    }
                }
            }
        }
    } else {
        // Monstros
        if (layersEl) layersEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
};


// ══════════════════════════════════════════════════
// HUD DE BATALHA
// ══════════════════════════════════════════════════
window.updateBattleUI = function () {
    // 1. Atualiza as barras do Player
    if (window.playerFullStats && window.playerFullStats.computed) {
        const c = window.playerFullStats.computed;
        const hpEl = document.getElementById('player-hp-fill');
        const mpEl = document.getElementById('player-mp-fill');
        const spEl = document.getElementById('player-sp-fill');

        if (hpEl) hpEl.style.width = `${Math.max(0, (window.playerHP / c.hp) * 100)}%`;
        if (mpEl) mpEl.style.width = `${Math.max(0, (window.playerMana / c.mana) * 100)}%`;
        if (spEl) spEl.style.width = `${Math.max(0, (window.playerStamina / c.stamina) * 100)}%`;
    }

    // 2. Atualiza as barras dos Aliados (Party)
    if (typeof updatePartyHUD === 'function') updatePartyHUD();

    // 3. Atualiza as barras dos Inimigos de forma segura
    if (window.currentEnemies) {
        window.currentEnemies.forEach((e, i) => {
            const block = document.getElementById(`enemy-hud-block-${i}`);
            if (!block) return;
            if (e.isDead) { block.classList.add('dead'); return; }

            const c = e.stats.computed;
            const hpE = document.getElementById(`enemy-hp-fill-${i}`);
            const mpE = document.getElementById(`enemy-mp-fill-${i}`);
            const spE = document.getElementById(`enemy-sp-fill-${i}`);

            if (hpE) hpE.style.width = `${Math.max(0, (e.hp / c.hp) * 100)}%`;
            if (mpE) mpE.style.width = `${Math.max(0, (e.mana / c.mana) * 100)}%`;
            if (spE) spE.style.width = `${Math.max(0, (e.stamina / c.stamina) * 100)}%`;
        });
    }

    // Atualiza a barra de ação (ATB)
    if (typeof window.updateATBBars === 'function') window.updateATBBars();

    // Libera os botões de ataque se não estiver no meio do turno
    if (!window.isTurnBusy && typeof toggleCombatButtons === 'function') toggleCombatButtons(false);
};

window.updateATBBars = function () {
    if (!window.combatants) return;
    window.combatants.forEach(c => {
        if (c.isDead) return;
        let pct = Math.min(100, Math.max(0, (c.actionValue / 1000) * 100));
        let el = null;

        if (c.isPlayer) {
            el = document.getElementById('player-atb-fill');
        } else if (c.isAlly) {
            el = document.getElementById(`ally-atb-fill-${c.memberId}`);
        } else {
            el = document.getElementById(`enemy-atb-fill-${c.id}`);
        }

        if (el) el.style.width = `${pct}%`;
    });
};


window.setCombatTarget = function (index) {
    if (!window.currentEnemies[index] || window.currentEnemies[index].isDead) return;
    window.combatTargetIndex = index;
    document.querySelectorAll('.enemy-container-slot').forEach(el => el.classList.remove('is-targeted'));
    document.getElementById(`enemy-container-${index}`).classList.add('is-targeted');
    document.querySelectorAll('.enemy-stat').forEach(el => el.classList.remove('is-targeted-hud'));
    document.getElementById(`enemy-hud-block-${index}`).classList.add('is-targeted-hud');
};

window.autoSelectNextTarget = function () {
    let aliveIndex = window.currentEnemies.findIndex(e => !e.isDead);
    if (aliveIndex !== -1) window.setCombatTarget(aliveIndex);
};

window.showFloatingDamage = function (containerId, text, typeClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const span = document.createElement('span');
    span.innerText = text;
    span.className = `floating-dmg ${typeClass}`;
    container.appendChild(span);
    setTimeout(() => { if (span.parentNode) span.remove(); }, 1200);
};

// ══════════════════════════════════════════════════
// CONTROLE MANUAL / AUTOMÁTICO DE ALIADOS
// ══════════════════════════════════════════════════

/**
 * Renderiza o toggle de controle + seletor de combatente ativo
 * Inserido no #visual-novel-ui, acima da hotbar
 */
window.renderCombatControlBar = function () {
    let bar = document.getElementById('combat-control-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'combat-control-bar';
        bar.className = 'combat-control-bar';
        const ui = document.getElementById('visual-novel-ui');
        if (ui) ui.insertBefore(bar, ui.firstChild);
    }

    const isAuto = window._allyControlMode === 'auto';
    const party = window._party || [];
    const hired = window._hiredAllies || [];
    const hasAllies = party.length > 0;

    // Botões dos combatentes selecionáveis
    let combatantBtns = '';
    if (!isAuto && hasAllies) {
        // Botão do player
        const isPlayerActive = window._activeCombatantControl === 'player' || !window._activeCombatantControl;
        combatantBtns += `
            <button class="ccb-combatant-btn${isPlayerActive ? ' active' : ''}" 
                    onclick="selectCombatantControl('player')"
                    title="${window.activePlayer?.name || 'Jogador'}">
                <span>🧑</span>
                <span class="ccb-cname">${(window.activePlayer?.name || 'Você').substring(0, 8)}</span>
            </button>`;
        // Botões dos aliados
        party.forEach(memberId => {
            const ally = hired.find(a => a.member_id === memberId);
            if (!ally) return;
            const ps = window._partyStats?.[memberId];
            if (!ps || ps.isDead) return;
            const isActive = window._activeCombatantControl === memberId;
            combatantBtns += `
                <button class="ccb-combatant-btn${isActive ? ' active' : ''}"
                        onclick="selectCombatantControl('${memberId}')"
                        title="${ally.name}">
                    <span>⚔️</span>
                    <span class="ccb-cname">${ally.name.substring(0, 8)}</span>
                </button>`;
        });
    }

    bar.innerHTML = `
        <div class="ccb-left">
            ${hasAllies ? `
            <button class="ccb-mode-btn${isAuto ? ' auto' : ' manual'}" onclick="toggleAllyControlMode()">
                ${isAuto ? '🤖 Auto' : '🎮 Manual'}
            </button>` : ''}
            ${!isAuto && hasAllies ? `<div class="ccb-combatant-row">${combatantBtns}</div>` : ''}
        </div>
        <div class="ccb-right">
            <span id="ccb-active-label" class="ccb-active-label">
                ${isAuto ? '' : _getCombatantLabel()}
            </span>
        </div>
    `;
};

function _getCombatantLabel() {
    const ctrl = window._activeCombatantControl;
    if (!ctrl || ctrl === 'player') return `Controlando: <strong>${window.activePlayer?.name || 'Jogador'}</strong>`;
    const ally = (window._hiredAllies || []).find(a => String(a.member_id) === String(ctrl));
    return ally ? `Controlando: <strong style="color:#2ecc71;">${ally.name}</strong>` : '';
}

window.toggleAllyControlMode = function () {
    window._allyControlMode = window._allyControlMode === 'auto' ? 'manual' : 'auto';
    if (window._allyControlMode === 'manual') {
        window._activeCombatantControl = 'player';
    } else {
        window._activeCombatantControl = 'player';
    }
    renderCombatHotbar();
    window.renderCombatControlBar();
};

window.selectCombatantControl = function (id) {
    window._activeCombatantControl = id;
    renderCombatHotbar();
    window.renderCombatControlBar();
    updateBattleUI();
};

// ══════════════════════════════════════════════════
// HOTBAR DE COMBATE — Player OU Aliado selecionado
// ══════════════════════════════════════════════════
function renderCombatHotbar() {
    const container = document.getElementById('combat-hotbar');
    if (!container) return;
    container.innerHTML = '';

    const isManual = window._allyControlMode === 'manual';
    const ctrl = window._activeCombatantControl;
    const isAllyCtrl = isManual && ctrl && ctrl !== 'player';

    // Decide qual hotbar exibir
    let hotbar, expMap, attacksFn;

    if (isAllyCtrl) {
        // Hotbar do aliado selecionado
        const ally = (window._hiredAllies || []).find(a => String(a.member_id) === String(ctrl));
        hotbar = ally?.hotbar || [];
        expMap = {}; // aliados não têm attack_exp por enquanto
        attacksFn = (atkId) => {
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            return atk || null;
        };
    } else {
        // Hotbar do player
        hotbar = window.playerHotbar;
        expMap = window.attackExp;
        attacksFn = (atkId) => window.gameData.attacks.find(a => a.id == atkId);
    }

    // Garante 10 slots
    const slots = Array.from({ length: 10 }, (_, i) => hotbar[i] ?? null);

    slots.forEach((atkId) => {
        const btn = document.createElement('button');
        if (atkId !== null) {
            const atk = attacksFn(atkId);
            if (atk) {
                btn.className = `hotbar-slot hb-atk-${atk.atk_type}`;
                btn.dataset.atkId = atkId;
                const expObj = expMap[atkId] || { level: 1 };
                btn.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level}</div>`;

                if (isAllyCtrl) {
                    btn.onclick = () => window.startAllyTurnSequence(ctrl, atk.id);
                } else {
                    btn.onclick = () => window.startTurnSequence(atk.id);
                }
            } else {
                btn.className = 'hotbar-slot empty';
            }
        } else {
            btn.className = 'hotbar-slot empty';
        }
        container.appendChild(btn);
    });

    // Atualiza label do controle
    const lbl = document.getElementById('ccb-active-label');
    if (lbl) lbl.innerHTML = _getCombatantLabel();
}

// ══════════════════════════════════════════════════
// TURNO MANUAL DO ALIADO
// ══════════════════════════════════════════════════
window._pendingAllyAction = null; // { memberId, attackId } — preenchido no modo manual

/**
 * Chamado quando o jogador clica num ataque da hotbar de um aliado.
 * Armazena a ação pendente; o processNextTurn() vai consumi-la.
 */
window.startAllyTurnSequence = async function (memberId, attackId) {
    if (window.isTurnBusy) return;

    // Verifica se é realmente a vez do aliado
    const actor = window.combatants?.find(c => c.isAlly && String(c.memberId) === String(memberId));
    if (!actor || actor.isDead) return;

    // Verifica se o aliado tem actionValue suficiente para agir
    const maxAV = Math.max(...(window.combatants?.map(c => c.actionValue) || [0]));
    if (actor.actionValue < maxAV) {
        window.showToast('Ainda não é a vez deste aliado!', 'error');
        return;
    }

    window._pendingAllyAction = { memberId: String(memberId), attackId };
    // Deixa o loop processNextTurn() executar o turno do aliado
    await window._executeManualAllyTurn(actor, attackId);
};

window._executeManualAllyTurn = async function (actor, attackId) {
    window.isTurnBusy = true;
    toggleCombatButtons(true);

    const memberId = actor.memberId;
    const ps = window._partyStats?.[memberId];
    if (!ps) { window.isTurnBusy = false; toggleCombatButtons(false); return; }

    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) {
        window.autoSelectNextTarget();
        target = window.currentEnemies[window.combatTargetIndex];
    }
    if (!target || target.isDead) { window.isTurnBusy = false; return; }

    const res = await window.pywebview.api.process_battle_turn(ps.stats, target.stats, attackId, 1);

    ps.hp = Math.max(0, ps.hp - res.hp_cost);
    ps.stamina = Math.max(0, ps.stamina - res.stamina_cost);
    ps.mana = Math.max(0, ps.mana - res.mana_cost);

    let msg;
    if (res.dodged) {
        window.showFloatingDamage(`enemy-container-${target.index}`, "Esquiva!", "dmg-dodge");
        msg = `[${ps.ally.name}]: Inimigo esquivou!`;
    } else {
        target.hp = Math.max(0, target.hp - res.damage);
        const css = res.is_crit ? 'dmg-crit' : (res.atk_type === 'mag' ? 'dmg-mag' : 'dmg-phys');
        window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, css);
        msg = `[${ps.ally.name}]: ${res.msg}`;
    }

    updateBattleUI();
    updatePartyHUD();
    document.getElementById('combat-dialogue').innerText = msg;

    actor.actionValue -= 1000;
    window.updateATBBars();
    window._pendingAllyAction = null;

    setTimeout(() => {
        if (target.hp <= 0) {
            target.isDead = true;
            const c = window.combatants.find(co => !co.isPlayer && !co.isAlly && co.id === target.index);
            if (c) c.isDead = true;
            document.getElementById(`enemy-container-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.add('dead');
            document.getElementById(`enemy-hud-block-${target.index}`)?.classList.remove('is-targeted-hud');
        }
        window.isTurnBusy = false;
        setTimeout(() => window.processNextTurn(), 400);
    }, 600);
};

window.toggleCombatButtons = function (isDisabled) {
    // 1. Desativa/Ativa Hotbar
    document.querySelectorAll('.hotbar-slot:not(.empty)').forEach(btn => {
        if (isDisabled) {
            btn.disabled = true;
        } else {
            const atkId = btn.dataset.atkId;
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if (atk) {
                const canPay = (atk.hp_cost || 0) <= window.playerHP &&
                    (atk.mana_cost || 0) <= window.playerMana &&
                    (atk.stamina_cost || 0) <= window.playerStamina;
                btn.disabled = !canPay;
            }
        }
    });

    // 2. Desativa/Ativa Fuga (e esconde no torneio)
    const btnFlee = document.getElementById('flee-btn');
    if (btnFlee) {
        if (window.combatContext === 'tournament') {
            btnFlee.style.display = 'none';
        } else {
            btnFlee.style.display = 'block';
            btnFlee.disabled = isDisabled;
        }
    }

    // 3. Cria e gerencia o botão de DESCANSAR
    let btnRest = document.getElementById('rest-btn');
    if (!btnRest) {
        const actionsDiv = document.querySelector('.actions');
        if (actionsDiv) {
            btnRest = document.createElement('button');
            btnRest.id = 'rest-btn';
            btnRest.innerHTML = '💤 Descansar Turno <span style="font-size:0.75em;display:block;">(Recupera +20 MP/SP)</span>';
            btnRest.style.cssText = 'background:#2980b9; width:100%; max-width:250px; margin-top:10px; padding:8px; border-radius:5px; border:none; color:white; font-weight:bold; cursor:pointer;';
            btnRest.onclick = window.restTurn;

            if (btnFlee) actionsDiv.insertBefore(btnRest, btnFlee);
            else actionsDiv.appendChild(btnRest);
        }
    }
    if (btnRest) {
        btnRest.disabled = isDisabled;
    }
};

function toggleCombatButtons(state) {
    window.toggleCombatButtons(state);
}

// ══════════════════════════════════════════════════
// SKILLBOOK DO PLAYER
// ══════════════════════════════════════════════════
window.openSkillbook = function () { document.getElementById('skillbook-modal').style.display = 'flex'; renderSkillbook(); };
window.closeSkillbook = async function () { document.getElementById('skillbook-modal').style.display = 'none'; hideSkillTooltip(); await window.saveGameState(); };
window.clearHotbar = function () { window.playerHotbar = Array(10).fill(null); renderSkillbook(); };

function renderSkillbook() {
    const sourceDiv = document.getElementById('sb-drag-source');
    const hotbarDiv = document.getElementById('sb-hotbar-grid');
    sourceDiv.innerHTML = ''; hotbarDiv.innerHTML = '';

    let attacks = [];
    try { attacks = typeof window.playerAttacks === "string" ? JSON.parse(window.playerAttacks) : window.playerAttacks; } catch (e) { }

    attacks.forEach(atkId => {
        const atk = window.gameData.attacks.find(a => a.id == atkId);
        if (atk) {
            let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
            const reqXp = expObj.level * 100;
            const pct = (expObj.xp / reqXp) * 100;
            sourceDiv.innerHTML += `
                <div class="drag-skill-item hb-atk-${atk.atk_type}" draggable="true"
                     ondragstart="sbDragStart(event, ${atk.id}, 'source')"
                     onmouseenter="showSkillTooltip(${atk.id}, event)" onmouseleave="hideSkillTooltip()">
                    <span class="hb-atk-name">${atk.name}</span>
                    <div class="hb-atk-lvl" style="bottom:auto;top:2px;">Lv${expObj.level}</div>
                    <div style="position:absolute;bottom:0;left:0;height:4px;background:#2ecc71;width:${pct}%;"></div>
                </div>`;
        }
    });

    // 10 slots
    const hotbar = Array.from({ length: 10 }, (_, i) => window.playerHotbar[i] ?? null);
    hotbar.forEach((atkId, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'hotbar-slot ' + (atkId ? '' : 'empty');
        slotDiv.setAttribute('ondragover', 'sbDragOver(event)');
        slotDiv.setAttribute('ondragleave', 'sbDragLeave(event)');
        slotDiv.setAttribute('ondrop', `sbDrop(event, ${index})`);
        slotDiv.setAttribute('oncontextmenu', `event.preventDefault(); removeSkillFromHotbar(${index});`);
        if (atkId) {
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if (atk) {
                slotDiv.classList.add(`hb-atk-${atk.atk_type}`);
                slotDiv.draggable = true;
                slotDiv.setAttribute('ondragstart', `sbDragStart(event, ${atk.id}, ${index})`);
                slotDiv.setAttribute('onmouseenter', `showSkillTooltip(${atk.id}, event)`);
                slotDiv.setAttribute('onmouseleave', 'hideSkillTooltip()');
                let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
                slotDiv.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level}</div>`;
            }
        }
        hotbarDiv.appendChild(slotDiv);
    });
}

window.sbDragStart = function (ev, atkId, origin) { ev.dataTransfer.setData("atkId", atkId); ev.dataTransfer.setData("origin", origin); };
window.sbDragOver = function (ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); };
window.sbDragLeave = function (ev) { ev.currentTarget.classList.remove('drag-over'); };
window.sbDrop = function (ev, targetIndex) {
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over');
    const atkId = parseInt(ev.dataTransfer.getData("atkId"));
    const origin = ev.dataTransfer.getData("origin");
    if (origin !== 'source') {
        const originIndex = parseInt(origin);
        const temp = window.playerHotbar[targetIndex];
        window.playerHotbar[targetIndex] = atkId;
        window.playerHotbar[originIndex] = temp;
    } else {
        window.playerHotbar[targetIndex] = atkId;
    }
    renderSkillbook();
};
window.removeSkillFromHotbar = function (index) {
    if (window.playerHotbar[index] !== null) { window.playerHotbar[index] = null; renderSkillbook(); }
};

// ══════════════════════════════════════════════════
// TOOLTIP DE HABILIDADE
// ══════════════════════════════════════════════════
let hoveredSkill = null;
window.showSkillTooltip = function (atkId, event) {
    hoveredSkill = atkId;
    const tooltip = document.getElementById('skill-tooltip');
    if (!tooltip) return;
    const atk = window.gameData.attacks.find(a => a.id == atkId);
    if (!atk) return;

    let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
    const reqXp = expObj.level * 100;

    let costsHtml = "";
    if (atk.hp_cost > 0) costsHtml += `<span style="color:#e74c3c;">❤${atk.hp_cost}</span> `;
    if (atk.mana_cost > 0) costsHtml += `<span style="color:#3498db;">💧${atk.mana_cost}</span> `;
    if (atk.stamina_cost > 0) costsHtml += `<span style="color:#f1c40f;">⚡${atk.stamina_cost}</span>`;
    if (!costsHtml) costsHtml = "Nenhum Custo";

    let scalingHtml = "";
    try {
        const scaling = JSON.parse(atk.scaling || '{}');
        for (const stat in scaling) {
            if (scaling[stat] !== 0)
                scalingHtml += `<span>${window.STAT_MAP.base[stat] || stat}: <strong style="color:#2ecc71;">x${scaling[stat]}</strong></span>`;
        }
    } catch (e) { }
    if (!scalingHtml) scalingHtml = "Nenhum Atributo de Escala";
    else scalingHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">${scalingHtml}</div>`;

    tooltip.innerHTML = `
        <h3 style="color:#f1c40f;margin-bottom:5px;">${atk.name} (Lv ${expObj.level})</h3>
        <p style="color:#bdc3c7;font-size:0.9em;margin-bottom:8px;">${atk.atk_type === 'phys' ? 'Ataque Físico' : 'Ataque Mágico'}</p>
        <hr style="border:1px solid #444;margin:5px 0;">
        <p style="color:#bdc3c7;margin-bottom:8px;">${atk.description || "Sem descrição."}</p>
        <p style="color:#ecf0f1;font-weight:bold;margin-bottom:5px;">Dano Base: ${atk.base_power.toFixed(1)} <span style="font-size:0.8em;color:#777;">(+${((expObj.level - 1) * 0.1).toFixed(1)} por Nível)</span></p>
        <p style="color:#ecf0f1;font-weight:bold;margin-bottom:5px;">Custo: ${costsHtml}</p>
        <p style="color:#ecf0f1;font-weight:bold;margin-bottom:5px;">Escalonamento:</p>${scalingHtml}
        <hr style="border:1px solid #444;margin:5px 0;">
        <p style="font-size:0.8em;color:#7f8c8d;">XP: ${expObj.xp}/${reqXp}</p>
    `;
    tooltip.style.display = 'block';
    let x = event.clientX + 15;
    let y = event.clientY + 15;
    if (x + tooltip.offsetWidth > window.innerWidth) x = window.innerWidth - tooltip.offsetWidth - 10;
    if (y + tooltip.offsetHeight > window.innerHeight) y = window.innerHeight - tooltip.offsetHeight - 10;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
};
window.hideSkillTooltip = function () {
    hoveredSkill = null;
    const t = document.getElementById('skill-tooltip');
    if (t) t.style.display = 'none';
};
