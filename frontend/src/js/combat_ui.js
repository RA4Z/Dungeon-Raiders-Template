// frontend/src/js/combat_ui.js

window.combatTargetIndex = 0; 

function buildBattleCharacter(characterData, side, imgId, layersId) {
    const imgEl = imgId ? document.getElementById(imgId) : null;
    const layersEl = layersId ? document.getElementById(layersId) : null;
    if (!characterData) return;

    if (characterData.race === 'humano') {
        if (imgEl) imgEl.style.display = 'none';
        if (layersEl) { layersEl.style.display = 'block'; layersEl.innerHTML = ''; }

        let eqDataMap = typeof characterData.equipment_data === 'string' ? JSON.parse(characterData.equipment_data) : characterData.equipment_data;

        window.EQUIP_SLOTS.forEach((slot, index) => {
            const itemId = eqDataMap[slot];
            if (itemId) {
                let itemData = slot === 'base' ? window.gameData.bodies.find(b => b.id == itemId) : window.gameData.equipments.find(e => e.id == itemId);
                if (itemData && layersEl) {
                    const img = side === 'f' ? itemData.img_front : itemData.img_back;
                    if (img) layersEl.innerHTML += `<img src="${img}" style="z-index: ${index}; position:absolute; width:100%; height:100%; object-fit:contain;">`;
                }
            }
        });
    } else {
        if (layersEl) layersEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = side === 'f' ? characterData.img_front : characterData.img_back;
        }
    }
}

function updateBattleUI() {
    if (window.playerFullStats && window.playerFullStats.computed) {
        const c = window.playerFullStats.computed;
        document.getElementById('player-hp-fill').style.width = `${Math.max(0, (window.playerHP / c.hp) * 100)}%`;
        document.getElementById('player-mp-fill').style.width = `${Math.max(0, (window.playerMana / c.mana) * 100)}%`;
        document.getElementById('player-sp-fill').style.width = `${Math.max(0, (window.playerStamina / c.stamina) * 100)}%`;
    }

    if (window.currentEnemies) {
        window.currentEnemies.forEach((e, i) => {
            const block = document.getElementById(`enemy-hud-block-${i}`);
            if (!block) return;
            if (e.isDead) {
                block.classList.add('dead');
                return;
            }
            const c = e.stats.computed;
            document.getElementById(`enemy-hp-fill-${i}`).style.width = `${Math.max(0, (e.hp / c.hp) * 100)}%`;
            document.getElementById(`enemy-mp-fill-${i}`).style.width = `${Math.max(0, (e.mana / c.mana) * 100)}%`;
            document.getElementById(`enemy-sp-fill-${i}`).style.width = `${Math.max(0, (e.stamina / c.stamina) * 100)}%`;
        });
    }

    window.updateATBBars();

    if (!window.isTurnBusy) toggleCombatButtons(false);
}

// Atualiza dinamicamente as barras de Ação Baseado na "Action Value" calculada
window.updateATBBars = function() {
    if (!window.combatants) return;
    window.combatants.forEach(c => {
        if (c.isDead) return;
        let pct = Math.min(100, Math.max(0, (c.actionValue / 1000) * 100));
        
        if (c.isPlayer) {
            let el = document.getElementById('player-atb-fill');
            if (el) el.style.width = `${pct}%`;
        } else if (c.isAlly) {
            let el = document.getElementById(`ally-atb-fill-${c.memberId}`);
            if (el) el.style.width = `${pct}%`;
        } else {
            let el = document.getElementById(`enemy-atb-fill-${c.id}`);
            if (el) el.style.width = `${pct}%`;
        }
    });
}

window.setCombatTarget = function(index) {
    if (!window.currentEnemies[index] || window.currentEnemies[index].isDead) return;
    window.combatTargetIndex = index;
    
    document.querySelectorAll('.enemy-container-slot').forEach(el => el.classList.remove('is-targeted'));
    document.getElementById(`enemy-container-${index}`).classList.add('is-targeted');

    document.querySelectorAll('.enemy-stat').forEach(el => el.classList.remove('is-targeted-hud'));
    document.getElementById(`enemy-hud-block-${index}`).classList.add('is-targeted-hud');
}

window.autoSelectNextTarget = function() {
    let aliveIndex = window.currentEnemies.findIndex(e => !e.isDead);
    if(aliveIndex !== -1) window.setCombatTarget(aliveIndex);
}

window.showFloatingDamage = function(containerId, text, typeClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const span = document.createElement('span');
    span.innerText = text;
    span.className = `floating-dmg ${typeClass}`;
    container.appendChild(span);
    setTimeout(() => { if(span.parentNode) span.remove(); }, 1200);
}

// ==== HOTBAR & SKILLS ====
function renderCombatHotbar() {
    const container = document.getElementById('combat-hotbar');
    if (!container) return;
    container.innerHTML = '';
    window.playerHotbar.forEach((atkId) => {
        const btn = document.createElement('button');
        if (atkId !== null) {
            const atk = window.gameData.attacks.find(a => a.id == atkId);
            if(atk) {
                btn.className = `hotbar-slot hb-atk-${atk.atk_type}`;
                btn.dataset.atkId = atkId; 
                let expObj = window.attackExp[atkId] || { level: 1 };
                btn.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level}</div>`;
                btn.onclick = () => window.startTurnSequence(atk.id);
            } else { btn.className = 'hotbar-slot empty'; }
        } else { btn.className = 'hotbar-slot empty'; }
        container.appendChild(btn);
    });
}

function toggleCombatButtons(state) {
    document.querySelectorAll('.hotbar-slot:not(.empty)').forEach(btn => {
        if (state) btn.disabled = true;
        else {
            const atk = window.gameData.attacks.find(a => a.id == btn.dataset.atkId);
            if (atk) {
                btn.disabled = !((atk.hp_cost||0) <= window.playerHP && (atk.mana_cost||0) <= window.playerMana && (atk.stamina_cost||0) <= window.playerStamina);
            }
        }
    });
    const btnFlee = document.getElementById('flee-btn');
    if (btnFlee) btnFlee.disabled = state;
}

window.openSkillbook = function() { document.getElementById('skillbook-modal').style.display = 'flex'; renderSkillbook(); }
window.closeSkillbook = async function() { document.getElementById('skillbook-modal').style.display = 'none'; hideSkillTooltip(); await window.saveGameState(); }
window.clearHotbar = function() { window.playerHotbar =[null, null, null, null, null, null, null, null, null, null]; renderSkillbook(); }

function renderSkillbook() {
    const sourceDiv = document.getElementById('sb-drag-source');
    const hotbarDiv = document.getElementById('sb-hotbar-grid');
    sourceDiv.innerHTML = ''; hotbarDiv.innerHTML = '';

    let attacks =[];
    try { attacks = typeof window.playerAttacks === "string" ? JSON.parse(window.playerAttacks) : window.playerAttacks; } catch(e){}
    
    attacks.forEach(atkId => {
        const atk = window.gameData.attacks.find(a => a.id == atkId);
        if(atk) {
            let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
            const reqXp = expObj.level * 100;
            const pct = (expObj.xp / reqXp) * 100;
            sourceDiv.innerHTML += `
                <div class="drag-skill-item hb-atk-${atk.atk_type}" draggable="true" 
                     ondragstart="sbDragStart(event, ${atk.id}, 'source')" 
                     onmouseenter="showSkillTooltip(${atk.id}, event)" onmouseleave="hideSkillTooltip()">
                    <span class="hb-atk-name">${atk.name}</span>
                    <div class="hb-atk-lvl" style="bottom: auto; top: 2px;">Lv${expObj.level}</div>
                    <div style="position:absolute; bottom:0; left:0; height:4px; background:#2ecc71; width:${pct}%;"></div>
                </div>
            `;
        }
    });

    window.playerHotbar.forEach((atkId, index) => {
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
                slotDiv.setAttribute('onmouseleave', `hideSkillTooltip()`);
                let expObj = window.attackExp[atkId] || { xp: 0, level: 1 };
                slotDiv.innerHTML = `<span class="hb-atk-name">${atk.name}</span><div class="hb-atk-lvl">Lv${expObj.level}</div>`;
            }
        }
        hotbarDiv.appendChild(slotDiv);
    });
}

window.sbDragStart = function(ev, atkId, origin) { ev.dataTransfer.setData("atkId", atkId); ev.dataTransfer.setData("origin", origin); }
window.sbDragOver = function(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
window.sbDragLeave = function(ev) { ev.currentTarget.classList.remove('drag-over'); }
window.sbDrop = function(ev, targetIndex) {
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
}
window.removeSkillFromHotbar = function(index) {
    if (window.playerHotbar[index] !== null) {
        window.playerHotbar[index] = null;
        renderSkillbook();
    }
}

let hoveredSkill = null; 
window.showSkillTooltip = function(atkId, event) {
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
    if (costsHtml === "") costsHtml = "Nenhum Custo";

    let scalingHtml = "";
    try {
        const scaling = JSON.parse(atk.scaling || '{}');
        for (const stat in scaling) {
            if (scaling[stat] !== 0) scalingHtml += `<span>${window.STAT_MAP.base[stat] || stat}: <strong style="color:#2ecc71;">x${scaling[stat]}</strong></span>`;
        }
    } catch(e) {}
    if (scalingHtml === "") scalingHtml = "Nenhum Atributo de Escala";
    else scalingHtml = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:3px;">${scalingHtml}</div>`;

    tooltip.innerHTML = `
        <h3 style="color:#f1c40f; margin-bottom:5px;">${atk.name} (Lv ${expObj.level})</h3>
        <p style="color:#bdc3c7; font-size:0.9em; margin-bottom: 8px;">${atk.atk_type === 'phys' ? 'Ataque Físico' : 'Ataque Mágico'}</p>
        <hr style="border:1px solid #444; margin: 5px 0;">
        <p style="color:#bdc3c7; margin-bottom: 8px;">${atk.description || "Sem descrição."}</p>
        <p style="color:#ecf0f1; font-weight:bold; margin-bottom:5px;">Dano Base: ${atk.base_power.toFixed(1)} <span style="font-size:0.8em; color:#777;">(+${((expObj.level -1) * 0.1).toFixed(1)} por Nível)</span></p>
        <p style="color:#ecf0f1; font-weight:bold; margin-bottom:5px;">Custo: ${costsHtml}</p>
        <p style="color:#ecf0f1; font-weight:bold; margin-bottom:5px;">Escalonamento:</p> ${scalingHtml}
        <hr style="border:1px solid #444; margin: 5px 0;">
        <p style="font-size:0.8em; color:#7f8c8d;">XP: ${expObj.xp}/${reqXp}</p>
    `;
    tooltip.style.display = 'block';

    let x = event.clientX + 15;
    let y = event.clientY + 15;
    if (x + tooltip.offsetWidth > window.innerWidth) x = window.innerWidth - tooltip.offsetWidth - 10;
    if (y + tooltip.offsetHeight > window.innerHeight) y = window.innerHeight - tooltip.offsetHeight - 10;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}
window.hideSkillTooltip = function() {
    hoveredSkill = null;
    document.getElementById('skill-tooltip').style.display = 'none';
}