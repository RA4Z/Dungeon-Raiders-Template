// frontend/src/js/core/audio_manager.js
// ═══════════════════════════════════════════════════════════════════════════
// AUDIO MANAGER — BGM + SFX com fallback ZzFX procedural
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1 — CONFIGURE SEUS ARQUIVOS AQUI
// Deixe a string vazia ('') para usar o som procedural gerado por IA.
// ═══════════════════════════════════════════════════════════════════════════
const AUDIO_ASSETS = {
    bgm: {
        // ── Preencha o caminho quando o arquivo existir. Vazio = silêncio (sem erro 404). ──
        city:       'assets/audio/bgm_city.mp3',    // ex: 'assets/audio/bgm_city.mp3'
        combat:     'assets/audio/bgm_combat.mp3',    // ex: 'assets/audio/bgm_combat.mp3'
        dungeon:    '',
        menu:       '',
        victory:    '',
    },
    sfx: {
        // Interface — vazio = som procedural ZzFX. Preencha com seu arquivo quando tiver.
        click:          '',    // ex: 'assets/audio/sfx_click.wav'
        open_menu:      '',
        close_menu:     '',
        error:          '',
        toast_success:  '',
        toast_error:    '',

        // Combate
        hit_phys:       '',
        hit_mag:        '',
        crit_hit:       '',
        dodge:          '',
        flee:           '',
        enemy_death:    '',
        player_death:   '',

        // Progressão
        level_up:       '',
        xp_gain:        '',
        equip_item:     '',
        unequip_item:   '',

        // Loja / Ouro
        buy_item:       '',
        sell_item:      '',
        gold_drop:      '',

        // Dungeon / Mundo
        floor_advance:  '',
        dungeon_enter:  '',
        door_open:      '',
        quest_complete: '',
        loot_drop:      '',

        // Torneio / Guilda
        tournament_win: '',
        fanfare:        '',
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2 — BIBLIOTECA ZzFX (micro-sintetizador — não editar)
// Fonte: https://github.com/KilledByAPixel/ZzFX  (MIT License)
// ═══════════════════════════════════════════════════════════════════════════
let zzfxContext = null;

function _zzfxGetCtx() {
    if (!zzfxContext) zzfxContext = new (window.AudioContext || window.webkitAudioContext)();
    return zzfxContext;
}

function _zzfxPlayBuffer(buffer) {
    const ctx = _zzfxGetCtx();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
    return src;
}

function zzfx(
    volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
    release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
    bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0
) {
    const ctx        = _zzfxGetCtx();
    const sampleRate = ctx.sampleRate;
    const PI2        = Math.PI * 2;

    let startSlide   = slide *= 500 * PI2 / sampleRate / sampleRate;
    let startFreq    = frequency *= (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate;
    let b = [], t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0, f, length;

    attack  = attack  * sampleRate | 0;
    decay   = decay   * sampleRate | 0;
    sustain = sustain * sampleRate | 0;
    release = release * sampleRate | 0;
    delay   = delay   * sampleRate | 0;

    length = attack + decay + sustain + release + delay | 0;

    for (; i < length; b[i++] = s * volume) {
        if (!(++c % (bitCrush * 100 | 0))) {
            s  = shape ? shape > 1 ? shape > 2 ? shape > 3
                ? Math.sign(Math.cos((9 * Math.cos(f * .001)) * frequency))
                : Math.cos(t * f * 2)
                : 1 - (2 * t * f / PI2 % 2 + 2) % 2
                : 1 - 4 * Math.abs(Math.round(t * f / PI2) - t * f / PI2)
                : Math.sin(t * f);

            s = (repeatTime
                ? 1 - tremolo + tremolo * Math.sin(PI2 * t / repeatTime)
                : 1) * Math.sign(s) * Math.abs(s) ** shapeCurve
                * (i < attack ? i / attack
                : i < attack + decay
                ? 1 - (i - attack) / decay * (1 - sustainVolume)
                : i < attack + decay + sustain ? sustainVolume
                : i < length - delay ? (length - i - delay) / release * sustainVolume
                : 0);

            s = delay ? s / 2 + (delay > i ? 0
                : (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0] / 2) : s;
        }

        if (modulation) f += Math.sin(i * modulation) * 2;
        if (pitchJump)  { if (!(tm++ % (pitchJumpTime * sampleRate | 0))) { frequency += pitchJump; startFreq += pitchJump; } }

        t += 1;
        f  = frequency += slide;
        frequency += deltaSlide;
        if (j && !(++r % (noise * sampleRate | 0))) { frequency = startFreq; slide = startSlide; j = 0; }
    }

    const audioBuffer = ctx.createBuffer(1, length, sampleRate);
    audioBuffer.getChannelData(0).set(b);
    return audioBuffer;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3 — SONS PROCEDURAIS (parâmetros ZzFX criados pela IA)
// Formato: zzfx(volume, randomness, freq, attack, sustain, release, shape, ...)
// ═══════════════════════════════════════════════════════════════════════════
const PROCEDURAL_SFX = {
    // ── Interface ────────────────────────────────────────────────────────
    // Click suave: sine wave curta, alta frequência
    click: () => zzfx(
        .4, .05, 1200, 0, 0, .06, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Abrir menu: slide ascendente
    open_menu: () => zzfx(
        .3, 0, 400, 0, 0, .15, 0, 1.5, 8, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Fechar menu: slide descendente
    close_menu: () => zzfx(
        .3, 0, 600, 0, 0, .12, 0, 1.5, -8, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Erro: tom baixo distorcido
    error: () => zzfx(
        .5, .1, 120, 0, .05, .2, 3, 1, -5, 0, 0, 0, 0, 0, 0, .2, 0, .8, 0, 0
    ),
    // Toast sucesso: bipe limpo alto
    toast_success: () => zzfx(
        .4, 0, 880, 0, 0, .12, 0, 1, 0, 0, 200, .05, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Toast erro: bipe baixo duplo
    toast_error: () => zzfx(
        .4, 0, 220, 0, .04, .15, 3, 1, -3, 0, 0, 0, 0, 0, 0, 0, 0, .8, 0, 0
    ),

    // ── Combate ──────────────────────────────────────────────────────────
    // Hit físico: corte metálico com impacto
    hit_phys: () => zzfx(
        .6, .1, 180, 0, 0, .18, 3, .8, -15, 5, 0, 0, 0, .4, 0, .15, 0, .6, .05, 0
    ),
    // Hit mágico: brilho espiralar
    hit_mag: () => zzfx(
        .5, .05, 660, 0, .04, .25, 0, 2, 12, -3, 300, .08, 0, 0, .3, 0, 0, .8, 0, .1
    ),
    // Crítico: impacto pesado com reverb
    crit_hit: () => zzfx(
        .8, .15, 100, 0, .02, .3, 3, .5, -30, 10, 0, 0, 0, .6, 0, .3, .1, .5, .05, 0
    ),
    // Esquiva: whoosh de ar
    dodge: () => zzfx(
        .35, .05, 400, 0, 0, .14, 0, 2, 25, 0, 0, 0, 0, .2, 0, 0, 0, 1, 0, 0
    ),
    // Fugir: passos rápidos + som de esforço
    flee: () => zzfx(
        .4, .2, 250, 0, 0, .2, 2, 1, -20, 8, 0, 0, 0, .3, 0, 0, 0, .7, 0, 0
    ),
    // Morte inimigo: explosão seca
    enemy_death: () => zzfx(
        .7, .2, 60, 0, 0, .4, 3, .4, -8, 3, 0, 0, 0, .8, 0, .4, 0, .4, .1, 0
    ),
    // Morte player: tom grave descendente e lento
    player_death: () => zzfx(
        .9, .05, 200, .1, .3, .8, 0, .5, -10, 0, 0, 0, 0, 0, 0, 0, 0, .3, .2, 0
    ),

    // ── Progressão ───────────────────────────────────────────────────────
    // Level up: arpejo ascendente (3 notas)
    level_up: () => {
        const ctx = _zzfxGetCtx();
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const buf = zzfx(.5, 0, freq, 0, .08, .2, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, .05);
                _zzfxPlayBuffer(buf);
            }, i * 90);
        });
        return null; // retorno null = sem buffer único
    },
    // XP ganho: tic suave
    xp_gain: () => zzfx(
        .25, 0, 900, 0, 0, .07, 0, 1.2, 5, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Equipar item: clique metálico
    equip_item: () => zzfx(
        .45, .05, 800, 0, .02, .1, 1, 1.5, 0, 0, 0, 0, 0, .1, 0, 0, 0, 1, 0, 0
    ),
    // Desequipar: clique inverso
    unequip_item: () => zzfx(
        .3, .05, 600, 0, 0, .1, 1, 1.2, -3, 0, 0, 0, 0, .1, 0, 0, 0, 1, 0, 0
    ),

    // ── Loja / Economia ───────────────────────────────────────────────────
    // Compra: moedas tilintando
    buy_item: () => {
        [0, 60, 120].forEach(delay => {
            setTimeout(() => {
                const f = 1200 + Math.random() * 400;
                const buf = zzfx(.3, .1, f, 0, 0, .08, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                _zzfxPlayBuffer(buf);
            }, delay);
        });
        return null;
    },
    // Venda: moeda única grave
    sell_item: () => zzfx(
        .35, .05, 800, 0, .03, .12, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    ),
    // Ouro dropando: coins tilintando
    gold_drop: () => zzfx(
        .3, .15, 1400, 0, 0, .06, 0, 1.5, 0, 0, 0, 0, 0, .1, 0, 0, 0, 1, 0, 0
    ),

    // ── Dungeon / Mundo ───────────────────────────────────────────────────
    // Avançar andar: fanfarra curta ascendente
    floor_advance: () => {
        [392, 523, 659].forEach((freq, i) => {
            setTimeout(() => {
                const buf = zzfx(.5, 0, freq, 0, .06, .18, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                _zzfxPlayBuffer(buf);
            }, i * 80);
        });
        return null;
    },
    // Entrar dungeon: tom ominoso descendente
    dungeon_enter: () => zzfx(
        .6, 0, 300, .1, .2, .5, 0, .6, -8, 0, 0, 0, 0, 0, 0, 0, 0, .4, .1, 0
    ),
    // Porta abrindo: rangido
    door_open: () => zzfx(
        .4, .3, 150, 0, .1, .4, 2, .7, 3, -2, 0, 0, 0, .5, 0, .1, 0, .5, .05, 0
    ),
    // Quest completa: fanfarra vitoriosa
    quest_complete: () => {
        [523, 659, 784, 1047].forEach((freq, i) => {
            setTimeout(() => {
                const buf = zzfx(.55, 0, freq, 0, .1, .25, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, .05);
                _zzfxPlayBuffer(buf);
            }, i * 100);
        });
        return null;
    },
    // Loot dropando: som de item materializando
    loot_drop: () => zzfx(
        .4, .05, 440, 0, .05, .2, 0, 1.8, 10, 0, 0, 0, 0, 0, .15, 0, 0, .8, 0, .08
    ),

    // ── Torneio / Guilda ──────────────────────────────────────────────────
    // Vitória no torneio: fanfarra épica
    tournament_win: () => {
        const melody = [523, 659, 784, 659, 1047];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                const buf = zzfx(.65, 0, freq, 0, .12, .3, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, .08);
                _zzfxPlayBuffer(buf);
            }, i * 120);
        });
        return null;
    },
    // Fanfarra geral
    fanfare: () => {
        [392, 523, 659, 784].forEach((freq, i) => {
            setTimeout(() => {
                const buf = zzfx(.5, 0, freq, 0, .08, .22, 1, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
                _zzfxPlayBuffer(buf);
            }, i * 90);
        });
        return null;
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4 — AUDIO MANAGER (Singleton)
// ═══════════════════════════════════════════════════════════════════════════
const AudioManager = (() => {

    // ── Estado interno ───────────────────────────────────────────────────
    let _bgmVolume    = 0.5;
    let _sfxVolume    = 0.7;
    let _muted        = false;
    let _currentBGM   = null;   // HTMLAudioElement ativo
    let _currentTrack = null;   // nome da faixa ativa
    let _fadeInterval = null;
    let _initialized  = false;

    // ── Constantes ───────────────────────────────────────────────────────
    const LS_KEY_BGM  = 'rpg_audio_bgm_vol';
    const LS_KEY_SFX  = 'rpg_audio_sfx_vol';
    const LS_KEY_MUTE = 'rpg_audio_muted';
    // (crossfade removido — troca de música é imediata via _killCurrentBGM)

    // ─────────────────────────────────────────────────────────────────────
    function init() {
        // Carrega configurações salvas
        const savedBGM  = parseFloat(localStorage.getItem(LS_KEY_BGM));
        const savedSFX  = parseFloat(localStorage.getItem(LS_KEY_SFX));
        const savedMute = localStorage.getItem(LS_KEY_MUTE);

        if (!isNaN(savedBGM))   _bgmVolume = savedBGM;
        if (!isNaN(savedSFX))   _sfxVolume = savedSFX;
        if (savedMute !== null) _muted = savedMute === 'true';

        _initialized = true;
        _syncAudioPanelUI();
        console.log('[AudioManager] Iniciado. BGM:', _bgmVolume, 'SFX:', _sfxVolume, 'Mute:', _muted);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Para qualquer BGM tocando imediatamente (sem fade)
    function _killCurrentBGM() {
        if (_fadeInterval) { clearInterval(_fadeInterval); _fadeInterval = null; }
        if (_currentBGM) {
            _currentBGM.onerror = null;   // ← evita que o onerror dispare após destruição
            _currentBGM.pause();
            _currentBGM.src = '';
            _currentBGM   = null;
        }
        _currentTrack = null;
    }

    function playBGM(trackName) {
        if (!_initialized) init();

        // Já tocando a mesma faixa com sucesso? Não reinicia.
        if (_currentTrack === trackName && _currentBGM && !_currentBGM.paused) return;

        // Para e destrói qualquer coisa que esteja tocando agora
        _killCurrentBGM();

        const path = AUDIO_ASSETS.bgm[trackName] || '';

        // Sem arquivo configurado → silêncio limpo, sem erro 404
        if (!path) return;

        const audio   = new Audio(path);
        audio.loop    = true;
        audio.volume  = _muted ? 0 : _bgmVolume;

        // Se o arquivo não existir: limpa estado sem acumular instâncias
        audio.onerror = () => {
            console.warn(`[AudioManager] BGM não encontrada: ${path}`);
            // Só limpa se ainda for ESTA instância (evita race condition)
            if (_currentBGM === audio) _killCurrentBGM();
        };

        audio.play().catch(() => {
            // Autoplay bloqueado → toca no primeiro clique do usuário
            const resume = () => {
                if (_currentBGM === audio) audio.play().catch(() => {});
                document.removeEventListener('click', resume);
            };
            document.addEventListener('click', resume, { once: true });
        });

        _currentBGM   = audio;
        _currentTrack = trackName;
    }

    // ─────────────────────────────────────────────────────────────────────
    function _stopBGMFade() { _killCurrentBGM(); }  // alias de compatibilidade

    // ─────────────────────────────────────────────────────────────────────
    function playSFX(effectName) {
        if (!_initialized) init();
        if (_muted) return;

        const path = AUDIO_ASSETS.sfx[effectName] || '';

        if (path) {
            // Tenta tocar arquivo real
            const audio = new Audio(path);
            audio.volume = _sfxVolume;
            audio.onerror = () => _playProceduralSFX(effectName);
            audio.play().catch(() => _playProceduralSFX(effectName));
        } else {
            _playProceduralSFX(effectName);
        }
    }

    function _playProceduralSFX(effectName) {
        const fn = PROCEDURAL_SFX[effectName];
        if (!fn) {
            console.warn(`[AudioManager] SFX desconhecido: ${effectName}`);
            return;
        }

        try {
            // Garante que o AudioContext está rodando (políticas de autoplay)
            const ctx = _zzfxGetCtx();
            if (ctx.state === 'suspended') ctx.resume();

            const buffer = fn();
            if (buffer) {
                // Aplica volume do SFX via GainNode
                const gainNode = ctx.createGain();
                gainNode.gain.value = _sfxVolume;
                gainNode.connect(ctx.destination);

                const src = ctx.createBufferSource();
                src.buffer = buffer;
                src.connect(gainNode);
                src.start();
            }
            // Se buffer for null, o som já foi tocado internamente (ex: arpejos com setTimeout)
        } catch (e) {
            console.error('[AudioManager] Erro ao tocar SFX procedural:', e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    function setVolume(type, value) {
        value = Math.max(0, Math.min(1, parseFloat(value) || 0));

        if (type === 'bgm') {
            _bgmVolume = value;
            if (_currentBGM && !_muted) _currentBGM.volume = value;
            localStorage.setItem(LS_KEY_BGM, value);
        } else if (type === 'sfx') {
            _sfxVolume = value;
            localStorage.setItem(LS_KEY_SFX, value);
        }

        _syncAudioPanelUI();
    }

    // ─────────────────────────────────────────────────────────────────────
    function toggleMute() {
        _muted = !_muted;
        localStorage.setItem(LS_KEY_MUTE, _muted);

        if (_currentBGM) {
            _currentBGM.volume = _muted ? 0 : _bgmVolume;
        }

        // Sincroniza contexto ZzFX
        if (zzfxContext) {
            _muted ? zzfxContext.suspend() : zzfxContext.resume();
        }

        _syncAudioPanelUI();
        return _muted;
    }

    // ─────────────────────────────────────────────────────────────────────
    function stopBGM() { _stopBGMFade(); }

    function getState() {
        return { bgmVolume: _bgmVolume, sfxVolume: _sfxVolume, muted: _muted, currentTrack: _currentTrack };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Sincroniza sliders do painel de config com o estado atual
    function _syncAudioPanelUI() {
        const sliderBGM  = document.getElementById('audio-vol-bgm');
        const sliderSFX  = document.getElementById('audio-vol-sfx');
        const labelBGM   = document.getElementById('audio-label-bgm');
        const labelSFX   = document.getElementById('audio-label-sfx');
        const muteBtn    = document.getElementById('audio-mute-btn');
        const muteIcon   = document.getElementById('audio-mute-icon');

        if (sliderBGM) sliderBGM.value = _bgmVolume;
        if (sliderSFX) sliderSFX.value = _sfxVolume;
        if (labelBGM)  labelBGM.textContent = Math.round(_bgmVolume * 100) + '%';
        if (labelSFX)  labelSFX.textContent = Math.round(_sfxVolume * 100) + '%';

        if (muteBtn) {
            muteBtn.classList.toggle('muted', _muted);
        }
        if (muteIcon) {
            muteIcon.textContent = _muted ? '🔇' : '🔊';
        }
    }

    // API pública
    return { init, playBGM, playSFX, setVolume, toggleMute, stopBGM, getState };

})();

// ── Expõe globalmente ─────────────────────────────────────────────────────
window.AudioManager = AudioManager;

// ── Auto-init após DOM carregado ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => AudioManager.init());