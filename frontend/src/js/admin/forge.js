// ── Estado local da forja ──────────────────────────
let _currentSetBonusTab = 2;
let _setBonus = { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };

// ── Navegação das tabs da forja ───────────────────
window.switchForgeTab = function (tab, btnEl) {
    document.querySelectorAll('.forge-tab-content').forEach(el => el.classList.remove('active-forge-tab'));
    document.querySelectorAll('.forge-nav-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(`forge-tab-${tab}`);
    if (target) target.classList.add('active-forge-tab');
    if (btnEl) btnEl.classList.add('active');

    if (tab === 'equipments') { renderForgeEquipList(); populateSetSelect(); }
    if (tab === 'bodies') renderForgeBodyList();
    if (tab === 'consumables') renderForgeConsList();
    if (tab === 'attacks') renderForgeAtkList();
    if (tab === 'sets') { renderForgeSetsPanel(); renderForgeSetBonusTab(); }
    if (tab === 'guilds') renderForgeGuildsTab();
};

// ── Sub-navegação dentro da aba Guildas ──────────
window.switchGuildForgeSection = function (section, btnEl) {
    document.querySelectorAll('.gf-section').forEach(s => s.classList.remove('active-gf-section'));
    document.querySelectorAll('.gf-subnav-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(`gf-section-${section}`);
    if (target) target.classList.add('active-gf-section');
    if (btnEl) btnEl.classList.add('active');
};

// ── Renderiza tudo da aba de Guildas ─────────────
function renderForgeGuildsTab() {
    populateGuildForgeSelects();
    renderForgeGuildList();
    renderForgeQuestList();
    renderForgeMemberList();
    _bindGuildEmblemPreview();
}

// ── Preview do emblema em tempo real ─────────────
function _bindGuildEmblemPreview() {
    const nameInput = document.getElementById('guild-name');
    const descInput = document.getElementById('guild-description');
    const colorInput = document.getElementById('guild-color');
    const iconInput = document.getElementById('guild-icon');
    if (!nameInput) return;

    const update = () => {
        const name = nameInput.value || 'Nome da Guilda';
        const desc = descInput?.value || 'Descrição da guilda';
        const color = colorInput?.value || '#e74c3c';
        const icon = iconInput?.value || '⚔️';
        const circle = document.getElementById('gep-circle');
        const gName = document.getElementById('gep-name');
        const gDesc = document.getElementById('gep-desc');
        if (circle) { circle.textContent = icon; circle.style.borderColor = color; circle.style.background = color + '22'; }
        if (gName) gName.textContent = name;
        if (gDesc) gDesc.textContent = desc;
    };

    [nameInput, descInput, colorInput, iconInput].forEach(el => {
        if (el) el.addEventListener('input', update);
    });
    update();
}

// ── Popula selects dependentes ────────────────────
function populateGuildForgeSelects() {
    const guilds = window.gameData?.guilds || [];
    const characters = window.gameData?.characters || [];

    // Select de guilda para Quests e Membros
    ['gq-guild-id', 'gm-guild-id'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Selecione uma Guilda —</option>';
        guilds.forEach(g => {
            sel.innerHTML += `<option value="${g.id}">${g.emblem_icon} ${g.name}</option>`;
        });
        sel.value = cur;
    });

    // Alvo da Quest
    const targetSel = document.getElementById('gq-target');
    if (targetSel) {
        const cur = targetSel.value;
        targetSel.innerHTML = '<option value="0">Qualquer Inimigo</option>';
        characters.forEach(c => {
            targetSel.innerHTML += `<option value="${c.id}">${c.name} (${c.race})</option>`;
        });
        targetSel.value = cur;
    }

    // Personagem do Membro
    const charSel = document.getElementById('gm-char-id');
    if (charSel) {
        const cur = charSel.value;
        charSel.innerHTML = '<option value="">— Selecione um Personagem —</option>';
        characters.forEach(c => {
            charSel.innerHTML += `<option value="${c.id}">${c.name} (${c.race})</option>`;
        });
        charSel.value = cur;
    }
}

// ── Limpeza de formulários de Guilda ─────────────
window.clearGuildForgeForm = function (type) {
    if (type === 'guild') {
        document.getElementById('edit-guild-id').value = '';
        document.getElementById('guild-name').value = '';
        document.getElementById('guild-description').value = '';
        document.getElementById('guild-color').value = '#e74c3c';
        document.getElementById('guild-icon').value = '⚔️';
        ['guild-rank1', 'guild-rank2', 'guild-rank3', 'guild-rank4', 'guild-rank5'].forEach((id, i) => {
            const defaults = ['Recruta', 'Veterano', 'Elite', 'Campeão', 'Lendário'];
            const el = document.getElementById(id);
            if (el) el.value = defaults[i];
        });
        _bindGuildEmblemPreview();
    }
    if (type === 'quest') {
        document.getElementById('edit-gquest-id').value = '';
        document.getElementById('gq-name').value = '';
        document.getElementById('gq-description').value = '';
        document.getElementById('gq-difficulty').value = '1';
        document.getElementById('gq-gold').value = '50';
        document.getElementById('gq-rep').value = '10';
        document.getElementById('gq-days').value = '0';
        document.getElementById('gq-kills').value = '0';
    }
    if (type === 'member') {
        document.getElementById('edit-gmember-id').value = '';
        document.getElementById('gm-hire-cost').value = '100';
        document.getElementById('gm-wage').value = '10';
    }
};

// ── Listas da aba de Guildas ──────────────────────
function renderForgeGuildList() {
    const el = document.getElementById('forge-guilds-list');
    if (!el) return;
    const guilds = window.gameData?.guilds || [];
    if (!guilds.length) { el.innerHTML = '<p class="forge-empty">Nenhuma guilda cadastrada.</p>'; return; }
    el.innerHTML = guilds.map(g => `
        <div class="forge-list-item">
            <div class="fli-preview" style="width:36px;height:36px;border-radius:50%;background:${g.emblem_color}22;border:2px solid ${g.emblem_color};display:flex;align-items:center;justify-content:center;font-size:1.1rem;">${g.emblem_icon}</div>
            <div class="fli-info">
                <strong style="color:${g.emblem_color};">${g.name}</strong>
                <span>${g.description || 'Sem descrição'}</span>
            </div>
            <div class="fli-actions">
                <button onclick="editItem('guilds',${g.id})">✏️</button>
                <button onclick="deleteItem('guilds',${g.id})" class="fli-del">🗑️</button>
            </div>
        </div>`).join('');
}

function renderForgeQuestList() {
    const el = document.getElementById('forge-quests-list');
    if (!el) return;
    const quests = window.gameData?.guild_quests || [];
    const guilds = window.gameData?.guilds || [];
    if (!quests.length) { el.innerHTML = '<p class="forge-empty">Nenhuma quest cadastrada.</p>'; return; }
    const DIFF_ICONS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '💀', '👑'];
    el.innerHTML = quests.map(q => {
        const guild = guilds.find(g => g.id == q.guild_id);
        return `
        <div class="forge-list-item">
            <div class="fli-preview" style="font-size:1.2rem;">${DIFF_ICONS[Math.min(5, q.difficulty || 1)]}</div>
            <div class="fli-info">
                <strong>${q.name}</strong>
                <span>${guild ? `${guild.emblem_icon} ${guild.name}` : '—'}</span>
                <span style="color:#f1c40f;">🪙 ${q.gold_reward} | ⭐ ${q.rep_reward} rep</span>
            </div>
            <div class="fli-actions">
                <button onclick="editItem('guild_quests',${q.id})">✏️</button>
                <button onclick="deleteItem('guild_quests',${q.id})" class="fli-del">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function renderForgeMemberList() {
    const el = document.getElementById('forge-members-list');
    if (!el) return;
    const members = window.gameData?.guild_members || [];
    const guilds = window.gameData?.guilds || [];
    const characters = window.gameData?.characters || [];
    if (!members.length) { el.innerHTML = '<p class="forge-empty">Nenhum aliado recrutável cadastrado.</p>'; return; }

    // Agrupa por guilda para exibição
    const byGuild = {};
    members.forEach(m => {
        if (!byGuild[m.guild_id]) byGuild[m.guild_id] = [];
        byGuild[m.guild_id].push(m);
    });

    el.innerHTML = Object.entries(byGuild).map(([gid, mList]) => {
        const guild = guilds.find(g => g.id == gid);
        const rows = mList.map(m => {
            const char = characters.find(c => c.id == m.character_id);
            return `
                <div class="forge-list-item" style="margin-bottom:4px;">
                    <div class="fli-preview" style="font-size:1rem;">🧍</div>
                    <div class="fli-info">
                        <strong>${char ? char.name : `#${m.character_id}`}</strong>
                        <span>🪙 ${m.hire_cost} contratar · 💸 ${m.daily_wage}/dia</span>
                    </div>
                    <div class="fli-actions">
                        <button onclick="editItem('guild_members',${m.id})">✏️</button>
                        <button onclick="deleteItem('guild_members',${m.id})" class="fli-del">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        return `
            <div style="margin-bottom:12px;">
                <div style="font-size:0.78em;color:${guild?.emblem_color || '#e67e22'};font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;padding:4px 0;border-bottom:1px solid #21262d;margin-bottom:6px;">
                    ${guild ? `${guild.emblem_icon} ${guild.name}` : `Guilda #${gid}`}
                </div>
                ${rows}
            </div>`;
    }).join('');
}

// ── Limpeza de formulário (outros tipos) ─────────
window.clearForgeForm = function (type) {
    if (type === 'body') {
        ['edit-bd-id', 'bd-name', 'bd-img-f', 'bd-img-b', 'bd-img-f-f', 'bd-img-b-f'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const chk = document.getElementById('bd-playable'); if (chk) chk.checked = false;
        ['prev-bd-f', 'prev-bd-b', 'prev-bd-ff', 'prev-bd-bf'].forEach(id => {
            const img = document.getElementById(id); if (img) img.src = '';
        });
    }
    if (type === 'equip') {
        ['edit-eq-id', 'eq-name', 'eq-img-f', 'eq-img-b', 'eq-img-f-f', 'eq-img-b-f'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('eq-drop').value = '5';
        document.getElementById('eq-gender').value = 'both';
        document.getElementById('eq-set-id').value = '0';
        document.querySelectorAll('.stat-mod-input').forEach(i => i.value = 0);
        ['prev-eq-f', 'prev-eq-b', 'prev-eq-ff', 'prev-eq-bf'].forEach(id => {
            const img = document.getElementById(id); if (img) img.src = '';
        });
    }
    if (type === 'set') {
        document.getElementById('edit-set-id').value = '';
        document.getElementById('set-name').value = '';
        document.getElementById('set-description').value = '';
        _setBonus = { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
        renderForgeSetBonusTab();
    }
    if (type === 'cons') {
        ['edit-cons-id', 'cons-name', 'cons-img'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('cons-value').value = '50';
        document.getElementById('cons-drop').value = '20';
        const img = document.getElementById('prev-cons'); if (img) img.src = '';
    }
    if (type === 'atk') {
        ['edit-atk-id', 'atk-name', 'atk-description'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('atk-base').value = '5';
        document.getElementById('atk-hp-cost').value = '0';
        document.getElementById('atk-mana-cost').value = '0';
        document.getElementById('atk-stamina-cost').value = '5';
        document.querySelectorAll('.atk-scale-input').forEach(i => i.value = 0);
    }
};

// ── Popula select de sets nos equipamentos ────────
function populateSetSelect() {
    const sel = document.getElementById('eq-set-id');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="0">— Sem Set —</option>';
    (window.gameData?.equipment_sets || []).forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    sel.value = cur;
}

// ── Renders das listas (Corpos, Equips, etc.) ────
function renderForgeBodyList() {
    const el = document.getElementById('forge-bodies-list');
    if (!el) return;
    const bodies = window.gameData?.bodies || [];
    if (!bodies.length) { el.innerHTML = '<p class="forge-empty">Nenhum corpo cadastrado.</p>'; return; }
    el.innerHTML = bodies.map(b => `
        <div class="forge-list-item">
            <div class="fli-preview">${b.img_front ? `<img src="${b.img_front}">` : '🧍'}</div>
            <div class="fli-info">
                <strong>${b.name}</strong>
                <span>${b.is_playable ? '✅ Jogável' : '❌ NPC'}</span>
                <span>${b.img_front_f ? '♂♀' : '♂ apenas'}</span>
            </div>
            <div class="fli-actions">
                <button onclick="editItem('bodies',${b.id})">✏️</button>
                <button onclick="deleteItem('bodies',${b.id})" class="fli-del">🗑️</button>
            </div>
        </div>`).join('');
}

function renderForgeEquipList() {
    const el = document.getElementById('forge-equip-list');
    if (!el) return;
    const equips = window.gameData?.equipments || [];
    const sets = window.gameData?.equipment_sets || [];
    if (!equips.length) { el.innerHTML = '<p class="forge-empty">Nenhum equipamento cadastrado.</p>'; return; }
    el.innerHTML = equips.map(e => {
        const setObj = sets.find(s => s.id == e.set_id);
        const genderIcon = e.gender === 'male' ? '♂' : e.gender === 'female' ? '♀' : '♂♀';
        return `
        <div class="forge-list-item">
            <div class="fli-preview">${e.img_front ? `<img src="${e.img_front}">` : '⚔️'}</div>
            <div class="fli-info">
                <strong>${e.name}</strong>
                <span>${e.type?.toUpperCase()} ${genderIcon}</span>
                ${setObj ? `<span style="color:#f39c12;">🎁 ${setObj.name}</span>` : ''}
            </div>
            <div class="fli-actions">
                <button onclick="editItem('equipments',${e.id})">✏️</button>
                <button onclick="deleteItem('equipments',${e.id})" class="fli-del">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function renderForgeSetsPanel() {
    const el = document.getElementById('forge-sets-list');
    if (!el) return;
    const sets = window.gameData?.equipment_sets || [];
    if (!sets.length) { el.innerHTML = '<p class="forge-empty">Nenhum set cadastrado.</p>'; return; }
    el.innerHTML = sets.map(s => {
        const activeBonuses = [2, 3, 4, 5, 6].filter(n => {
            try { return Object.keys(JSON.parse(s[`bonus_${n}`] || '{}')).length > 0; } catch { return false; }
        });
        return `
        <div class="forge-list-item">
            <div class="fli-preview" style="font-size:1.5rem;">🎁</div>
            <div class="fli-info">
                <strong>${s.name}</strong>
                <span>${s.description || 'Sem descrição'}</span>
                <span style="color:#2ecc71;">Bônus: ${activeBonuses.map(n => n + 'p').join(', ') || 'nenhum'}</span>
            </div>
            <div class="fli-actions">
                <button onclick="editSetItem(${s.id})">✏️</button>
                <button onclick="deleteItem('equipment_sets',${s.id})" class="fli-del">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function renderForgeConsList() {
    const el = document.getElementById('forge-cons-list');
    if (!el) return;
    const items = window.gameData?.consumables || [];
    if (!items.length) { el.innerHTML = '<p class="forge-empty">Nenhum consumível cadastrado.</p>'; return; }
    el.innerHTML = items.map(c => `
        <div class="forge-list-item">
            <div class="fli-preview">${c.img_path ? `<img src="${c.img_path}">` : '🧪'}</div>
            <div class="fli-info">
                <strong>${c.name}</strong>
                <span>${c.effect_type} +${c.effect_value}</span>
            </div>
            <div class="fli-actions">
                <button onclick="editItem('consumables',${c.id})">✏️</button>
                <button onclick="deleteItem('consumables',${c.id})" class="fli-del">🗑️</button>
            </div>
        </div>`).join('');
}

function renderForgeAtkList() {
    const el = document.getElementById('forge-attacks-list');
    if (!el) return;
    const attacks = window.gameData?.attacks || [];
    if (!attacks.length) { el.innerHTML = '<p class="forge-empty">Nenhuma habilidade cadastrada.</p>'; return; }
    el.innerHTML = attacks.map(a => `
        <div class="forge-list-item">
            <div class="fli-preview" style="font-size:1.3rem;">${a.atk_type === 'phys' ? '⚔️' : '✨'}</div>
            <div class="fli-info">
                <strong>${a.name}</strong>
                <span>${a.atk_type === 'phys' ? 'Físico' : 'Mágico'} | Base: ${a.base_power}</span>
            </div>
            <div class="fli-actions">
                <button onclick="editItem('attacks',${a.id})">✏️</button>
                <button onclick="deleteItem('attacks',${a.id})" class="fli-del">🗑️</button>
            </div>
        </div>`).join('');
}

// ── Set bonus ─────────────────────────────────────
window.selectSetBonusTab = function (n, btnEl) {
    _currentSetBonusTab = n;
    document.querySelectorAll('.sbt').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderForgeSetBonusTab();
};

function renderForgeSetBonusTab() {
    const el = document.getElementById('set-bonus-content');
    if (!el) return;
    const n = _currentSetBonusTab;
    const bonus = _setBonus[n] || {};
    const allStats = { ...window.STAT_MAP?.base, ...window.STAT_MAP?.derived };
    let html = `<p style="color:#7f8c8d;font-size:0.82em;margin-bottom:10px;">Bônus ao equipar <strong style="color:#f39c12;">${n} peças</strong>.</p><div class="set-bonus-grid">`;
    for (let k in allStats) {
        const val = bonus[k] !== undefined ? bonus[k] : 0;
        html += `<label>${allStats[k]}<input type="number" step="0.1" class="set-bonus-input" data-stat="${k}" data-tier="${n}" value="${val}" oninput="_updateSetBonus(${n},'${k}',this.value)"></label>`;
    }
    el.innerHTML = html + '</div>';
}

window._updateSetBonus = function (n, stat, val) {
    if (!_setBonus[n]) _setBonus[n] = {};
    const fval = parseFloat(val) || 0;
    if (fval === 0) delete _setBonus[n][stat];
    else _setBonus[n][stat] = fval;
};

window.saveEquipmentSet = async function () {
    const editId = document.getElementById('edit-set-id').value;
    const name = document.getElementById('set-name').value;
    if (!name) return window.showToast('Nome do set é obrigatório!', 'error');
    const data = {
        name,
        description: document.getElementById('set-description').value || '',
        bonus_2: JSON.stringify(_setBonus[2] || {}),
        bonus_3: JSON.stringify(_setBonus[3] || {}),
        bonus_4: JSON.stringify(_setBonus[4] || {}),
        bonus_5: JSON.stringify(_setBonus[5] || {}),
        bonus_6: JSON.stringify(_setBonus[6] || {}),
    };
    const res = editId
        ? await window.pywebview.api.update_entity('equipment_sets', editId, data)
        : await window.pywebview.api.add_entity('equipment_sets', data);
    if (res.status === 'success') {
        window.showToast('Set salvo!', 'success');
        clearForgeForm('set');
        await window.refreshData();
        renderForgeSetsPanel();
        populateSetSelect();
    } else {
        window.showToast('Erro: ' + res.message, 'error');
    }
};

window.editSetItem = function (id) {
    const s = (window.gameData?.equipment_sets || []).find(x => x.id === id);
    if (!s) return;
    document.getElementById('edit-set-id').value = id;
    document.getElementById('set-name').value = s.name;
    document.getElementById('set-description').value = s.description || '';
    [2, 3, 4, 5, 6].forEach(n => {
        try { _setBonus[n] = JSON.parse(s[`bonus_${n}`] || '{}'); } catch { _setBonus[n] = {}; }
    });
    renderForgeSetBonusTab();
    window.showToast('Set carregado para edição.', 'success');
};

window.renderForgeStats = function() {
    const grid = document.getElementById('forge-stats-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const allStats = { ...window.STAT_MAP.base, ...window.STAT_MAP.derived };
    for (let k in allStats) {
        grid.innerHTML += `<label>${allStats[k]}
            <input type="number" class="stat-mod-input" data-stat="${k}" value="0" step="0.1">
        </label>`;
    }
};

// ── Salvar Habilidade ────────────────────────────
async function saveAttack() {
    const editId = document.getElementById('edit-atk-id').value;
    let scaling = {};
    document.querySelectorAll('.atk-scale-input').forEach(i => {
        const val = parseFloat(i.value);
        if (val > 0) scaling[i.dataset.stat] = val;
    });

    const data = {
        name:         document.getElementById('atk-name').value,
        atk_type:     document.getElementById('atk-type').value,
        hp_cost:      parseInt(document.getElementById('atk-hp-cost').value) || 0,
        mana_cost:    parseInt(document.getElementById('atk-mana-cost').value) || 0,
        stamina_cost: parseInt(document.getElementById('atk-stamina-cost').value) || 0,
        description:  document.getElementById('atk-description').value,
        base_power:   parseFloat(document.getElementById('atk-base').value) || 0,
        scaling:      JSON.stringify(scaling),
    };
    if (!data.name) return window.showToast("Nome obrigatório!", "error");

    if (editId) await window.pywebview.api.update_entity('attacks', editId, data);
    else        await window.pywebview.api.add_entity('attacks', data);

    window.showToast("Habilidade registrada!", "success");
    if (typeof clearForgeForm === 'function') clearForgeForm('atk');
    await window.refreshData();
    if (typeof renderForgeAtkList === 'function') renderForgeAtkList();
}

// ── Inicializa ao montar a página ─────────────────
setTimeout(() => {
    window.renderForgeStats();
    renderForgeBodyList();
    populateSetSelect();
}, 200);