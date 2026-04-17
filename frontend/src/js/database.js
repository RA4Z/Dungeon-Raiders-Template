// ── Variáveis de estado do DB ──────────────────────
window._currentDbTable = 'characters';
window._dbAllRows = [];

// Colunas amigáveis por tabela
const DB_COL_LABELS = {
    id:               'ID',
    name:             'Nome',
    race:             'Raça',
    img_front:        'Img Frente',
    img_back:         'Img Verso',
    equipment_data:   'Equipamentos',
    custom_drops:     'Drops',
    base_stats:       'Atributos',
    custom_substats:  'Sub-Status',
    attacks:          'Ataques',
    power_score:      'Poder',
    type:             'Tipo',
    drop_chance:      'Drop%',
    stats_modifiers:  'Modificadores',
    effect_type:      'Efeito',
    effect_value:     'Valor',
    img_path:         'Imagem',
    is_playable:      'Jogável?',
    atk_type:         'Tipo Atk',
    base_power:       'Poder Base',
    hp_cost:          'Custo HP',
    mana_cost:        'Custo Mana',
    stamina_cost:     'Custo Stamina',
    description:      'Descrição',
    scaling:          'Escala',
    emblem_color:     'Cor',
    emblem_icon:      'Ícone',
    rank_name_1:      'Rank 1',
    rank_name_2:      'Rank 2',
    rank_name_3:      'Rank 3',
    rank_name_4:      'Rank 4',
    rank_name_5:      'Rank 5',
    guild_id:         'Guilda',
    difficulty:       'Dificuldade',
    gold_reward:      '🪙 Ouro',
    rep_reward:       '⭐ Rep',
    required_kills:   'Kills',
    target_character_id: 'Alvo',
    time_limit_days:  'Limite Dias',
    character_id:     'Personagem',
    hire_cost:        '🪙 Contratar',
    daily_wage:       '💸 Salário/dia',
};

// Colunas a OCULTAR na visualização (muito longas / desnecessárias)
const DB_HIDDEN_COLS = {
    characters:   ['img_front','img_back','equipment_data','custom_drops','custom_substats'],
    equipments:   ['img_front','img_back','stats_modifiers'],
    consumables:  ['img_path'],
    bodies:       ['img_front','img_back'],
    attacks:      ['scaling','description'],
    guilds:       ['rank_name_1','rank_name_2','rank_name_3','rank_name_4','rank_name_5'],
    guild_quests: [],
    guild_members: [],
};

// Colunas com renderização especial
function renderCellValue(table, key, val) {
    if (val === null || val === undefined) return '<span style="color:#555;">—</span>';
    const str = String(val);

    if (key === 'is_playable') return val == 1 ? '<span style="color:#2ecc71;">✓ Sim</span>' : '<span style="color:#555;">Não</span>';
    if (key === 'race') return val === 'humano' ? '🧑 Humano' : '👹 Monstro';
    if (key === 'atk_type') return val === 'phys' ? '<span style="color:#e74c3c;">⚔️ Físico</span>' : '<span style="color:#9b59b6;">✨ Mágico</span>';
    if (key === 'emblem_color') return `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${val};border:1px solid #555;vertical-align:middle;"></span> ${val}`;
    if (key === 'difficulty') {
        const stars = '⭐'.repeat(Math.min(5, parseInt(val)||1));
        return stars;
    }
    if (key === 'drop_chance' || key === 'drop_chance') return `${val}%`;
    if (key === 'base_stats' || key === 'attacks' || key === 'scaling') {
        try {
            const obj = JSON.parse(str);
            if (Array.isArray(obj)) return `<span style="color:#7f8c8d;font-size:0.8em;">[${obj.join(', ')}]</span>`;
            const keys = Object.entries(obj).map(([k,v]) => `${k}:${v}`).join(' ');
            return `<span style="color:#7f8c8d;font-size:0.8em;">${keys || '—'}</span>`;
        } catch { return str.length > 30 ? str.substring(0,30)+'…' : str; }
    }
    if (str.length > 35) return `<span title="${str.replace(/"/g,'&quot;')}">${str.substring(0,35)}…</span>`;
    return str;
}

window.selectDbCategory = function(table, btnEl) {
    window._currentDbTable = table;
    document.querySelectorAll('.db-cat-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('db-search-input').value = '';
    renderCrudTable();
};

window.filterDbTable = function() {
    const q = document.getElementById('db-search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#crud-tbody tr');
    let visible = 0;
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const show = text.includes(q);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const info = document.getElementById('db-filtered-count');
    if (info) info.innerText = q ? `${visible} de ${rows.length} visíveis` : '';
};

window.renderCrudTable = async function() {
    const table = window._currentDbTable || 'characters';

    // Sincroniza o select legado (se existir)
    const legacySel = document.getElementById('crud-table-select');
    if (legacySel) legacySel.value = table;

    const data = window.gameData?.[table] || [];
    window._dbAllRows = data;

    const thead = document.getElementById('crud-thead');
    const tbody = document.getElementById('crud-tbody');
    const empty = document.getElementById('db-empty-state');
    const badge = document.getElementById('db-record-count');

    if (!thead || !tbody) return;
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (badge) badge.innerText = `${data.length} registro${data.length !== 1 ? 's' : ''}`;

    if (data.length === 0) {
        if (empty) empty.style.display = 'flex';
        document.getElementById('db-main-table').style.display = 'none';
        return;
    }

    if (empty) empty.style.display = 'none';
    document.getElementById('db-main-table').style.display = '';

    const hiddenCols = DB_HIDDEN_COLS[table] || [];
    const allKeys = Object.keys(data[0]).filter(k => !hiddenCols.includes(k));

    // Header
    allKeys.forEach(k => {
        const th = document.createElement('th');
        th.innerText = DB_COL_LABELS[k] || k;
        thead.appendChild(th);
    });
    const thAct = document.createElement('th');
    thAct.innerText = 'Ações';
    thAct.style.width = '110px';
    thead.appendChild(thAct);

    // Body
    data.forEach((row, ri) => {
        const tr = document.createElement('tr');
        tr.className = ri % 2 === 0 ? 'db-row-even' : 'db-row-odd';
        allKeys.forEach(k => {
            const td = document.createElement('td');
            td.innerHTML = renderCellValue(table, k, row[k]);
            tr.appendChild(td);
        });
        const tdAct = document.createElement('td');
        tdAct.className = 'db-actions-cell';
        tdAct.innerHTML = `
            <button class="db-btn-edit" onclick="editItem('${table}', ${row.id})" title="Editar">✏️</button>
            <button class="db-btn-del"  onclick="deleteItem('${table}', ${row.id})" title="Deletar">🗑️</button>
        `;
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
    });

    // Reaplicar filtro de busca, se houver
    filterDbTable();
};