// frontend/src/js/core/dev_console.js
// ═══════════════════════════════════════════════════════════════════════════
// CONSOLE DE DESENVOLVEDOR
// Atalho: tecla  '  ou  `  (fora de inputs)
// Fechar:  mesma tecla ou Esc
// ═══════════════════════════════════════════════════════════════════════════
// Para adicionar um comando novo em uma linha:
//   DevConsole.register('nome', 'Descrição do comando', (args) => { /* lógica */ return 'resultado'; });
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

const DevConsole = (() => {

    // ── Estado interno ────────────────────────────────────────────────────
    let _open       = false;
    let _history    = [];        // histórico de inputs (seta ↑↓)
    let _historyIdx = -1;
    let _inputEl    = null;
    let _logEl      = null;
    let _hintEl     = null;
    let _overlayEl  = null;

    // ── Registro de comandos ──────────────────────────────────────────────
    // Formato: { exec: (args: string[]) => string | void, desc: string }
    const registry = {};

    // ═════════════════════════════════════════════════════════════════════
    // API PÚBLICA — register()
    // ═════════════════════════════════════════════════════════════════════
    /**
     * Registra um novo comando no console.
     * @param {string}   name  - Nome do comando (sem a barra)
     * @param {string}   desc  - Descrição curta (usada no /help)
     * @param {Function} exec  - (args: string[]) => string | null
     *
     * Exemplo:
     *   DevConsole.register('kill', 'Mata todos os inimigos', () => {
     *       window.currentEnemies?.forEach(e => e.hp = 0);
     *       return 'Inimigos eliminados.';
     *   });
     */
    function register(name, desc, exec) {
        registry[name.toLowerCase()] = { desc, exec };
    }

    // ═════════════════════════════════════════════════════════════════════
    // COMANDOS INICIAIS
    // ═════════════════════════════════════════════════════════════════════

    // /help — lista todos os comandos
    register('help', 'Lista todos os comandos disponíveis', () => {
        const lines = ['<span style="color:var(--dc-amber);font-family:VT323,monospace;font-size:1.1em;">── COMANDOS DISPONÍVEIS ──</span>'];
        const sorted = Object.entries(registry).sort(([a], [b]) => a.localeCompare(b));
        for (const [name, { desc }] of sorted) {
            lines.push(`<span style="color:var(--dc-cyan);">/${name.padEnd(18)}</span>${desc}`);
        }
        return { html: lines.join('<br>'), type: 'help' };
    });

    // /clear — limpa o log
    register('clear', 'Limpa o histórico do console', () => {
        if (_logEl) _logEl.innerHTML = '';
        return null;   // null = sem mensagem após limpar
    });

    // /gold <qtd> — adiciona ouro
    register('gold', 'Adiciona ouro ao jogador. Ex: /gold 1000', (args) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount)) return { text: 'Uso: /gold <quantidade>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        window.playerGold = Math.max(0, window.playerGold + amount);
        _persist();
        return { text: `🪙 Ouro: ${amount >= 0 ? '+' : ''}${amount} → Total: ${window.playerGold}`, type: 'success' };
    });

    // /setgold <qtd> — define ouro exato
    register('setgold', 'Define ouro exato. Ex: /setgold 99999', (args) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 0) return { text: 'Uso: /setgold <valor_positivo>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        window.playerGold = amount;
        _persist();
        return { text: `🪙 Ouro definido para: ${amount}`, type: 'success' };
    });

    // /item <id> <tipo> — adiciona item ao inventário
    register('item', 'Adiciona item ao inventário. Ex: /item 3 equip  ou  /item 2 cons', (args) => {
        const id   = parseInt(args[0]);
        const tipo = (args[1] || '').toLowerCase();

        if (isNaN(id) || !['equip', 'cons'].includes(tipo))
            return { text: 'Uso: /item <id> <equip|cons>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        if (tipo === 'equip') {
            const exists = window.gameData?.equipments?.find(e => e.id === id);
            if (!exists) return { text: `Equipamento ID ${id} não encontrado no banco.`, type: 'error' };
            window.playerInventory.equipments.push(id);
            _persist();
            return { text: `⚔ Adicionado: ${exists.name} (ID ${id})`, type: 'success' };
        } else {
            const exists = window.gameData?.consumables?.find(c => c.id === id);
            if (!exists) return { text: `Consumível ID ${id} não encontrado no banco.`, type: 'error' };
            const cid = String(id);
            window.playerInventory.consumables[cid] = (window.playerInventory.consumables[cid] || 0) + 1;
            _persist();
            return { text: `🧪 Adicionado: ${exists.name} ×1 (ID ${id})`, type: 'success' };
        }
    });

    // /stat <nome> <valor> — define nível de stat
    register('stat', 'Define nível de atributo. Ex: /stat for 50  (for/int/des/car/res)', (args) => {
        const statKey = (args[0] || '').toLowerCase();
        const value   = parseInt(args[1]);
        const valid   = ['for', 'int', 'des', 'car', 'res'];

        if (!valid.includes(statKey)) return { text: `Stat inválido. Válidos: ${valid.join(', ')}`, type: 'error' };
        if (isNaN(value) || value < 1) return { text: 'Valor deve ser ≥ 1.', type: 'error' };
        if (!_requirePlayer()) return { text: 'Nenhum personagem ativo.', type: 'error' };

        const statNames = { for:'Força', int:'Inteligência', des:'Destreza', car:'Carisma', res:'Resistência' };
        window.activePlayer.base_stats[statKey] = value;

        // Zera o XP do stat para o novo nível
        if (window.playerStatExp) window.playerStatExp[statKey] = 0;

        _persist(true);   // recarrega stats completos
        return { text: `⬆ ${statNames[statKey]} definida para nível ${value}`, type: 'success' };
    });

    // /addstat <nome> <valor> — incrementa stat
    register('addstat', 'Incrementa atributo. Ex: /addstat for 10', (args) => {
        const statKey = (args[0] || '').toLowerCase();
        const amount  = parseInt(args[1]);
        const valid   = ['for', 'int', 'des', 'car', 'res'];

        if (!valid.includes(statKey)) return { text: `Stat inválido. Válidos: ${valid.join(', ')}`, type: 'error' };
        if (isNaN(amount)) return { text: 'Uso: /addstat <stat> <quantidade>', type: 'error' };
        if (!_requirePlayer()) return { text: 'Nenhum personagem ativo.', type: 'error' };

        const cur = parseInt(window.activePlayer.base_stats[statKey]) || 1;
        window.activePlayer.base_stats[statKey] = Math.max(1, cur + amount);

        _persist(true);
        return { text: `⬆ ${statKey.toUpperCase()}: ${cur} → ${window.activePlayer.base_stats[statKey]}`, type: 'success' };
    });

    // /day <qtd> — avança dias
    register('day', 'Avança dias. Ex: /day 7', (args) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1) return { text: 'Uso: /day <quantidade>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        window.playerDays += amount;
        _persist();
        return { text: `📅 Avançou ${amount} dia(s). Dia atual: ${window.playerDays}`, type: 'success' };
    });

    // /setday <dia> — define dia exato
    register('setday', 'Define o dia exato. Ex: /setday 100', (args) => {
        const day = parseInt(args[0]);
        if (isNaN(day) || day < 1) return { text: 'Uso: /setday <dia>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        window.playerDays = day;
        _persist();
        return { text: `📅 Dia definido para: ${day}`, type: 'success' };
    });

    // /heal — recupera HP/MP/SP
    register('heal', 'Recupera toda Vida, Mana e Stamina do jogador', () => {
        if (!_requirePlayer()) return { text: 'Nenhum personagem ativo.', type: 'error' };
        if (!window.playerFullStats) return { text: 'Stats não carregados ainda.', type: 'error' };

        const c = window.playerFullStats.computed;
        window.playerHP      = c.hp;
        window.playerMana    = c.mana;
        window.playerStamina = c.stamina;

        if (typeof window.updateHUD === 'function') window.updateHUD();
        if (typeof window.updateBattleUI === 'function') window.updateBattleUI();
        _persist();
        return { text: `💚 HP/MP/SP restaurados ao máximo.`, type: 'success' };
    });

    // /status — mostra status atual do jogador
    register('status', 'Mostra status atual do jogador', () => {
        if (!_requirePlayer()) return { text: 'Nenhum personagem ativo.', type: 'error' };

        const p    = window.activePlayer;
        const base = p.base_stats || {};
        const c    = window.playerFullStats?.computed || {};
        const lines = [
            `<span style="color:var(--dc-amber);">── ${p.name} ──</span>`,
            `Ouro: ${window.playerGold} 🪙 | Dia: ${window.playerDays}`,
            `HP: ${Math.floor(window.playerHP)}/${Math.floor(c.hp || 0)} | MP: ${Math.floor(window.playerMana)}/${Math.floor(c.mana || 0)} | SP: ${Math.floor(window.playerStamina)}/${Math.floor(c.stamina || 0)}`,
            `FOR:${base.for} INT:${base.int} DES:${base.des} CAR:${base.car} RES:${base.res}`,
            `Andar dungeon: ${window._dungeonCurrentFloor} / ${window._dungeonMaxFloor}`,
            `Aliados na party: ${(window._party || []).length} | Contratados: ${(window._hiredAllies || []).length}`,
        ];
        return { html: lines.join('<br>'), type: 'info' };
    });

    // /inventory — mostra inventário resumido
    register('inventory', 'Lista itens no inventário', () => {
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        const inv   = window.playerInventory || {};
        const equips = (inv.equipments || []);
        const cons   = inv.consumables || {};
        const lines  = [`<span style="color:var(--dc-amber);">── INVENTÁRIO ──</span>`];

        if (equips.length === 0 && Object.keys(cons).length === 0) {
            lines.push('Inventário vazio.');
        }

        equips.forEach(id => {
            const e = window.gameData?.equipments?.find(x => x.id == id);
            lines.push(`⚔ [${id}] ${e ? e.name : 'Desconhecido'}`);
        });

        for (const [cid, qty] of Object.entries(cons)) {
            const c = window.gameData?.consumables?.find(x => x.id == cid);
            lines.push(`🧪 [${cid}] ${c ? c.name : 'Desconhecido'} ×${qty}`);
        }

        return { html: lines.join('<br>'), type: 'info' };
    });

    // /listequip [filtro] — lista equipamentos do banco
    register('listequip', 'Lista equipamentos disponíveis no banco. Ex: /listequip sword', (args) => {
        const filter = (args[0] || '').toLowerCase();
        const all    = window.gameData?.equipments || [];
        const list   = filter ? all.filter(e => e.name.toLowerCase().includes(filter) || String(e.id) === filter) : all;

        if (list.length === 0) return { text: 'Nenhum equipamento encontrado.', type: 'warn' };

        const lines = [`<span style="color:var(--dc-amber);">── EQUIPAMENTOS (${list.length}) ──</span>`];
        list.slice(0, 30).forEach(e => {
            lines.push(`<span style="color:var(--dc-cyan);">[${String(e.id).padStart(3)}]</span> ${e.name} <span style="color:#666;">(${e.type})</span>`);
        });
        if (list.length > 30) lines.push(`<span style="color:#666;">... e mais ${list.length - 30}. Use um filtro para refinar.</span>`);

        return { html: lines.join('<br>'), type: 'help' };
    });

    // /listcons [filtro] — lista consumíveis do banco
    register('listcons', 'Lista consumíveis disponíveis no banco. Ex: /listcons poção', (args) => {
        const filter = (args[0] || '').toLowerCase();
        const all    = window.gameData?.consumables || [];
        const list   = filter ? all.filter(c => c.name.toLowerCase().includes(filter) || String(c.id) === filter) : all;

        if (list.length === 0) return { text: 'Nenhum consumível encontrado.', type: 'warn' };

        const lines = [`<span style="color:var(--dc-amber);">── CONSUMÍVEIS (${list.length}) ──</span>`];
        list.forEach(c => {
            lines.push(`<span style="color:var(--dc-cyan);">[${String(c.id).padStart(3)}]</span> ${c.name} <span style="color:#666;">(${c.effect_type}: +${c.effect_value})</span>`);
        });

        return { html: lines.join('<br>'), type: 'help' };
    });

    // /floor <andar> — vai para andar da dungeon
    register('floor', 'Define o andar atual da dungeon. Ex: /floor 10', (args) => {
        const floor = parseInt(args[0]);
        if (isNaN(floor) || floor < 1) return { text: 'Uso: /floor <andar>', type: 'error' };
        if (!_requireSave()) return { text: 'Nenhum save ativo.', type: 'error' };

        window._dungeonCurrentFloor = floor;
        if (floor > window._dungeonMaxFloor) window._dungeonMaxFloor = floor;

        window.pywebview?.api?.set_dungeon_floor?.(window.activeSaveId, floor, floor > window._dungeonMaxFloor);
        _persist();
        return { text: `🗺 Andar definido para: ${floor} (máx: ${window._dungeonMaxFloor})`, type: 'success' };
    });

    // /reload — recarrega dados do banco
    register('reload', 'Recarrega todos os dados do banco de dados', async () => {
        if (typeof window.refreshData === 'function') {
            await window.refreshData();
            return { text: '🔄 Dados recarregados do banco.', type: 'success' };
        }
        return { text: 'refreshData() não disponível.', type: 'error' };
    });

    // /eval <código> — executa JS arbitrário (debug avançado)
    register('eval', '⚠ Executa JavaScript arbitrário. Ex: /eval window.playerGold', (args) => {
        const code = args.join(' ');
        if (!code) return { text: 'Uso: /eval <código JS>', type: 'error' };
        try {
            // eslint-disable-next-line no-eval
            const result = eval(code);   // intencional — é um console de dev
            const str = (result === undefined) ? 'undefined' : JSON.stringify(result, null, 2);
            return { text: `→ ${str}`, type: 'info' };
        } catch (e) {
            return { text: `Erro: ${e.message}`, type: 'error' };
        }
    });

    // ═════════════════════════════════════════════════════════════════════
    // HELPERS INTERNOS
    // ═════════════════════════════════════════════════════════════════════
    function _requireSave()   { return !!window.activeSaveId; }
    function _requirePlayer() { return !!window.activePlayer; }

    async function _persist(reloadStats = false) {
        if (typeof window.updateHUD === 'function') window.updateHUD();
        if (reloadStats && typeof window.refreshPlayerStats === 'function') {
            await window.refreshPlayerStats();
            if (typeof window.updateHUD === 'function') window.updateHUD();
        }
        if (typeof window.saveGameState === 'function') await window.saveGameState();
    }

    // ═════════════════════════════════════════════════════════════════════
    // PROCESSAMENTO DE COMANDOS
    // ═════════════════════════════════════════════════════════════════════
    async function _execute(raw) {
        const trimmed = raw.trim();
        if (!trimmed) return;

        // Adiciona ao histórico
        _history.unshift(trimmed);
        if (_history.length > 50) _history.pop();
        _historyIdx = -1;

        // Exibe o input no log
        _log(trimmed, 'input', '›');

        // Parseia: remove barra inicial opcional
        const clean = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
        const parts = clean.trim().split(/\s+/);
        const cmd   = parts[0].toLowerCase();
        const args  = parts.slice(1);

        const entry = registry[cmd];

        if (!entry) {
            _log(`Comando desconhecido: /${cmd}. Digite /help para ver a lista.`, 'error');
            return;
        }

        try {
            const result = await entry.exec(args);
            if (result === null || result === undefined) return;

            if (typeof result === 'string') {
                _log(result, 'success');
            } else if (typeof result === 'object') {
                if (result.html) {
                    _logHTML(result.html, result.type || 'info');
                } else if (result.text) {
                    _log(result.text, result.type || 'info');
                }
            }
        } catch (err) {
            _log(`Erro interno: ${err.message}`, 'error');
            console.error('[DevConsole]', err);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // LOG
    // ═════════════════════════════════════════════════════════════════════
    function _log(text, type = 'info', prefix = '◆') {
        if (!_logEl) return;

        const PREFIXES = {
            input:   '›',
            success: '✓',
            error:   '✗',
            warn:    '⚠',
            info:    '◆',
            system:  '·',
            help:    '·',
        };

        const line    = document.createElement('div');
        line.className = `dc-line dc-${type}`;

        const pfx = document.createElement('span');
        pfx.className = 'dc-line-prefix';
        pfx.textContent = PREFIXES[type] || prefix;

        const txt = document.createElement('span');
        txt.className = 'dc-line-text';
        txt.textContent = text;

        line.appendChild(pfx);
        line.appendChild(txt);
        _logEl.appendChild(line);
        _logEl.scrollTop = _logEl.scrollHeight;
    }

    function _logHTML(html, type = 'info') {
        if (!_logEl) return;
        const line    = document.createElement('div');
        line.className = `dc-line dc-${type}`;

        const pfx = document.createElement('span');
        pfx.className = 'dc-line-prefix';
        pfx.textContent = '·';

        const txt = document.createElement('span');
        txt.className = 'dc-line-text';
        txt.innerHTML = html;

        line.appendChild(pfx);
        line.appendChild(txt);
        _logEl.appendChild(line);
        _logEl.scrollTop = _logEl.scrollHeight;
    }

    function _logSeparator() {
        if (!_logEl) return;
        const hr = document.createElement('hr');
        hr.className = 'dc-separator';
        _logEl.appendChild(hr);
    }

    // ═════════════════════════════════════════════════════════════════════
    // AUTOCOMPLETE
    // ═════════════════════════════════════════════════════════════════════
    function _updateHint(value) {
        if (!_hintEl) return;
        const v = value.startsWith('/') ? value.slice(1) : value;
        if (!v || v.includes(' ')) { _hintEl.textContent = ''; return; }

        const match = Object.keys(registry).find(k => k.startsWith(v.toLowerCase()) && k !== v.toLowerCase());
        _hintEl.textContent = match ? `/${match}` : '';
    }

    function _autocomplete() {
        if (!_inputEl || !_hintEl) return;
        const hint = _hintEl.textContent;
        if (hint) {
            _inputEl.value = hint;
            _hintEl.textContent = '';
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // CRIAÇÃO DO DOM
    // ═════════════════════════════════════════════════════════════════════
    function _createDOM() {
        if (document.getElementById('dev-console-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'dev-console-overlay';
        overlay.innerHTML = `
            <div id="dev-console-panel">
                <div id="dev-console-titlebar">
                    <div class="dc-title-left">
                        <span class="dc-dot dc-dot-red"></span>
                        <span class="dc-dot dc-dot-yellow"></span>
                        <span class="dc-dot dc-dot-green"></span>
                        <span class="dc-title-text">RPG Dev Console</span>
                    </div>
                    <span class="dc-title-hint">` + "`" + ` ou ' para fechar · ESC para fechar · ↑↓ histórico · TAB autocomplete</span>
                </div>
                <div id="dev-console-log"></div>
                <div id="dev-console-inputbar">
                    <span class="dc-prompt">›_</span>
                    <input id="dev-console-input" type="text"
                           autocomplete="off" autocorrect="off"
                           autocapitalize="off" spellcheck="false"
                           placeholder="Digite /help para ver os comandos..." />
                    <span id="dev-console-hint"></span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        _overlayEl = overlay;
        _logEl     = document.getElementById('dev-console-log');
        _inputEl   = document.getElementById('dev-console-input');
        _hintEl    = document.getElementById('dev-console-hint');

        // ── Eventos do input ──────────────────────────────────────────
        _inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = _inputEl.value;
                _inputEl.value = '';
                _hintEl.textContent = '';
                _execute(val);
                return;
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                _autocomplete();
                return;
            }

            if (e.key === 'Escape') {
                close();
                return;
            }

            // Seta ↑: histórico anterior
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (_historyIdx < _history.length - 1) {
                    _historyIdx++;
                    _inputEl.value = _history[_historyIdx] || '';
                }
                return;
            }

            // Seta ↓: histórico posterior
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (_historyIdx > 0) {
                    _historyIdx--;
                    _inputEl.value = _history[_historyIdx] || '';
                } else {
                    _historyIdx = -1;
                    _inputEl.value = '';
                }
                return;
            }
        });

        _inputEl.addEventListener('input', () => {
            _updateHint(_inputEl.value);
        });

        // Clique no overlay (fora do painel) fecha
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) close();
        });
    }

    // ═════════════════════════════════════════════════════════════════════
    // OPEN / CLOSE
    // ═════════════════════════════════════════════════════════════════════
    function open() {
        _createDOM();
        _overlayEl.classList.add('dc-open');
        _open = true;
        _inputEl?.focus();

        if (_logEl && _logEl.children.length === 0) {
            _logSeparator();
            _log('RPG Dev Console — bem-vindo, desenvolvedor.', 'system');
            _log('Use /help para ver a lista de comandos disponíveis.', 'system');
            _log('TAB para autocomplete · ↑↓ para histórico · ESC para fechar', 'system');
            _logSeparator();
        }
    }

    function close() {
        if (!_overlayEl) return;
        _overlayEl.classList.remove('dc-open');
        _open = false;
    }

    function toggle() {
        _open ? close() : open();
    }

    // ═════════════════════════════════════════════════════════════════════
    // ATALHO DE TECLADO
    // Abre/fecha com  '  ou  `  apenas quando o foco NÃO está em um input
    // ═════════════════════════════════════════════════════════════════════
    document.addEventListener('keydown', (e) => {
        // Teclas que abrem/fecham o console
        const isToggleKey = e.key === '`' || e.key === "'" || e.code === 'Backquote' || e.code === 'Quote';

        if (!isToggleKey) return;

        // Se o console estiver aberto: sempre fecha
        if (_open) {
            e.preventDefault();
            close();
            return;
        }

        // Se o foco estiver em um input/textarea/select: não abre
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;

        e.preventDefault();
        open();
    }, { capture: true });

    // ═════════════════════════════════════════════════════════════════════
    // API PÚBLICA
    // ═════════════════════════════════════════════════════════════════════
    return { open, close, toggle, register };

})();

// Expõe globalmente
window.DevConsole = DevConsole;