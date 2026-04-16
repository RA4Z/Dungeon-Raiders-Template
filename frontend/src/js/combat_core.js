// frontend/src/js/combat_core.js

window.enterDungeon = async function () {
    setView('combat-screen');
    document.getElementById('combat-dialogue').innerText = "Você adentra a caverna... procurando inimigos.";
    window.updateHUD();

    renderCombatHotbar();
    toggleCombatButtons(true);

    document.getElementById('player-name-ui').innerText = window.activePlayer.name;

    await buildBattleCharacter(window.activePlayer, 'f', 'player-hud-avatar-img', 'player-hud-avatar-layers');
    await buildBattleCharacter(window.activePlayer, 'b', 'player-image', 'player-layers');

    await spawnEnemies();
}

async function spawnEnemies() {
    window.currentEnemies = [];
    const numEnemies = Math.floor(Math.random() * window.MAX_ENEMIES_IN_COMBAT) + 1;

    const hudContainer = document.getElementById('enemies-hud-container');
    const battleContainer = document.getElementById('enemies-battlefield-container');
    hudContainer.innerHTML = '';
    battleContainer.innerHTML = '';

    let names = [];

    for (let i = 0; i < numEnemies; i++) {
        const enemyData = await window.pywebview.api.get_random_enemy();
        const enemyStats = await window.pywebview.api.load_enemy_full_stats(enemyData.id);

        let enemyObj = {
            index: i,
            id: enemyData.id,
            data: enemyData,
            stats: enemyStats,
            hp: enemyStats.computed.hp,
            mana: enemyStats.computed.mana,
            stamina: enemyStats.computed.stamina,
            isDead: false
        };
        window.currentEnemies.push(enemyObj);
        names.push(enemyData.name);

        // Adiciona HUD Menor Interativa
        hudContainer.innerHTML += `
            <div class="combat-stat-block enemy-stat" id="enemy-hud-block-${i}" onclick="window.setCombatTarget(${i})">
                <div style="flex:1;">
                    <span class="enemy-name-ui">${enemyData.name}</span>
                    <div class="bar-container"><span class="bar-label">HP</span><div class="bar-bg"><div id="enemy-hp-fill-${i}" class="bar-fill hp-fill"></div></div></div>
                    <div class="bar-container"><span class="bar-label">MP</span><div class="bar-bg"><div id="enemy-mp-fill-${i}" class="bar-fill mp-fill"></div></div></div>
                    <div class="bar-container"><span class="bar-label">SP</span><div class="bar-bg"><div id="enemy-sp-fill-${i}" class="bar-fill sp-fill"></div></div></div>
                </div>
                <div class="mini-avatar-box">
                    <div id="enemy-hud-avatar-layers-${i}" class="paper-doll-container" style="display:none;"></div>
                    <img id="enemy-hud-avatar-img-${i}" src="" style="display:none;">
                </div>
            </div>
        `;

        // Adiciona no Battlefield Interativo
        battleContainer.innerHTML += `
            <div id="enemy-container-${i}" class="enemy-container-slot" onclick="window.setCombatTarget(${i})">
                <div id="enemy-layers-${i}" class="paper-doll-container" style="display:none;"></div>
                <img id="enemy-image-${i}" src="" style="display:none;">
            </div>
        `;
    }

    for (let i = 0; i < numEnemies; i++) {
        let e = window.currentEnemies[i];
        await buildBattleCharacter(e.data, 'f', `enemy-image-${i}`, `enemy-layers-${i}`);
        await buildBattleCharacter(e.data, 'f', `enemy-hud-avatar-img-${i}`, `enemy-hud-avatar-layers-${i}`);
    }

    // Seleciona o alvo 0 automaticamente
    window.autoSelectNextTarget();

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = `Apareceu: ${names.join(', ')}!`;
    window.isTurnBusy = false;

    toggleCombatButtons(false);
}

window.startTurnSequence = async function (attackId) {
    if (window.isTurnBusy) return;

    // Se o alvo selecionado já estiver morto, acha o próximo vivo
    let target = window.currentEnemies[window.combatTargetIndex];
    if (!target || target.isDead) {
        window.autoSelectNextTarget();
        target = window.currentEnemies[window.combatTargetIndex];
    }

    if (!target || target.isDead) return; // Ninguém vivo pra bater

    window.isTurnBusy = true;
    toggleCombatButtons(true);

    if (!window.attackExp[attackId]) window.attackExp[attackId] = { xp: 0, level: 1 };
    let expObj = window.attackExp[attackId];

    const res = await window.pywebview.api.process_battle_turn(window.playerFullStats, target.stats, attackId, expObj.level);

    window.playerHP = Math.max(0, window.playerHP - res.hp_cost);
    window.playerStamina = Math.max(0, window.playerStamina - res.stamina_cost);
    window.playerMana = Math.max(0, window.playerMana - res.mana_cost);

    let levelUpMsg = "";

    if (res.dodged) {
        window.showFloatingDamage(`enemy-container-${target.index}`, "Esquiva!", "dmg-dodge");
    } else {
        target.hp = Math.max(0, target.hp - res.damage);

        // CSS anim para dano
        let cssClass = res.is_crit ? "dmg-crit" : (res.atk_type === 'mag' ? "dmg-mag" : "dmg-phys");
        window.showFloatingDamage(`enemy-container-${target.index}`, res.damage, cssClass);

        // Somente ganha XP se não errar (Opcional, você pode dar xp por usar também)
        let reqXp = expObj.level * 100;
        expObj.xp += 35;
        if (expObj.xp >= reqXp) {
            expObj.xp -= reqXp;
            expObj.level += 1;
            levelUpMsg = ` \n🌟[Nível ${expObj.level}]`;
            renderCombatHotbar();
        }
    }

    let msgs = [`Você atacou: ${res.msg}${levelUpMsg}`];

    if (target.hp <= 0) {
        target.isDead = true;
        document.getElementById(`enemy-container-${target.index}`).classList.add('dead');
        document.getElementById(`enemy-hud-block-${target.index}`).style.opacity = '0.3';
        document.getElementById(`enemy-hud-block-${target.index}`).classList.remove('is-targeted-hud');
        msgs.push(`Derrotou ${target.data.name}!`);
    }

    updateBattleUI();
    document.getElementById('combat-dialogue').innerText = msgs.join(' | ');

    setTimeout(async () => {
        let aliveEnemies = window.currentEnemies.filter(e => !e.isDead);

        if (aliveEnemies.length === 0) {
            window.winBattle();
            return;
        }

        // Se o alvo morreu, auto foca no próximo pro turno do inimigo ser claro
        window.autoSelectNextTarget();

        // Turno dos Inimigos (Todos vivos batem)
        msgs = [];
        for (let i = 0; i < aliveEnemies.length; i++) {
            let e = aliveEnemies[i];
            let enemyAtkIds = [1];
            try { enemyAtkIds = typeof e.data.attacks === "string" ? JSON.parse(e.data.attacks) : e.data.attacks; } catch (err) { }
            if (!enemyAtkIds || enemyAtkIds.length === 0) enemyAtkIds = [1];

            let affordable = enemyAtkIds.filter(id => {
                const ea = window.gameData.attacks.find(a => a.id == id);
                if (!ea) return false;
                return (ea.hp_cost || 0) <= e.hp && (ea.mana_cost || 0) <= e.mana && (ea.stamina_cost || 0) <= e.stamina;
            });

            if (affordable.length > 0) {
                let randomAtkId = affordable[Math.floor(Math.random() * affordable.length)];
                const resE = await window.pywebview.api.process_battle_turn(e.stats, window.playerFullStats, randomAtkId, 1);

                e.hp = Math.max(0, e.hp - resE.hp_cost);
                e.stamina = Math.max(0, e.stamina - resE.stamina_cost);
                e.mana = Math.max(0, e.mana - resE.mana_cost);

                if (resE.dodged) {
                    window.showFloatingDamage(`player-container`, "Esquiva!", "dmg-dodge");
                } else {
                    window.playerHP = Math.max(0, window.playerHP - resE.damage);
                    let cssClass = resE.is_crit ? "dmg-crit" : (resE.atk_type === 'mag' ? "dmg-mag" : "dmg-phys");
                    window.showFloatingDamage(`player-container`, resE.damage, cssClass);

                    const pContainer = document.getElementById('player-container');
                    if (pContainer) { pContainer.classList.add('enemy-hit'); setTimeout(() => pContainer.classList.remove('enemy-hit'), 200); }
                }
                msgs.push(`[${e.data.name}]: ${resE.msg}`);
            } else {
                e.hp = Math.min(e.stats.computed.hp, e.hp + 5);
                e.stamina = Math.min(e.stats.computed.stamina, e.stamina + 20);
                e.mana = Math.min(e.stats.computed.mana, e.mana + 20);
                msgs.push(`[${e.data.name}] descansou.`);
            }

            if (window.playerHP <= 0) break; // Para o loop se o player morrer
        }

        updateBattleUI();
        document.getElementById('combat-dialogue').innerText = msgs.join(' | ');

        if (window.playerHP <= 0) {
            let ouroPerdido = Math.floor(window.playerGold / 2);
            window.playerGold -= ouroPerdido;
            document.getElementById('combat-dialogue').innerText = `Você desmaiou e perdeu ${ouroPerdido} moedas!`;

            window.updateHUD();
            await window.saveGameState();

            setTimeout(() => {
                window.playerHP = window.playerFullStats.computed.hp;
                window.playerMana = window.playerFullStats.computed.mana;
                window.playerStamina = window.playerFullStats.computed.stamina;
                backToCity();
            }, 3500);
        } else {
            await window.saveGameState();
            window.isTurnBusy = false;
            toggleCombatButtons(false);
        }
    }, 1500);
}

window.winBattle = async function () {
    document.getElementById('combat-dialogue').innerText = "VITÓRIA! Buscando loots...";

    let allLoot = [];
    for (let i = 0; i < window.currentEnemies.length; i++) {
        let res = await window.pywebview.api.generate_loot(window.currentEnemies[i].id, window.activeSaveId);
        window.playerInventory = res.new_inventory;
        window.playerGold = res.new_gold;
        allLoot.push(...res.loot_list);
    }

    window.updateHUD();
    await window.saveGameState();

    setTimeout(() => {
        document.getElementById('loot-list').innerHTML = allLoot.map(l => `<li>✅ ${l}</li>`).join('');
        document.getElementById('loot-modal').style.display = 'flex';
    }, 1000);
}

window.continueDungeon = function () {
    document.getElementById('loot-modal').style.display = 'none';
    document.getElementById('combat-dialogue').innerText = "Você desce mais fundo...";
    toggleCombatButtons(true);
    spawnEnemies();
}

window.fleeBattle = function () {
    if (window.isTurnBusy) return;
    window.isTurnBusy = true;
    toggleCombatButtons(true);

    let aliveEnemies = window.currentEnemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return;

    let pDes = window.playerFullStats.base.des;
    let maxEDes = Math.max(...aliveEnemies.map(e => e.stats.base.des));

    let fleeChance = 50 + ((pDes - maxEDes) * 5);
    fleeChance = Math.max(10, Math.min(90, fleeChance));
    let roll = Math.random() * 100;

    if (roll <= fleeChance) {
        document.getElementById('combat-dialogue').innerText = "Fuga com sucesso!";
        setTimeout(() => { window.isTurnBusy = false; backToCity(); }, 1500);
    } else {
        document.getElementById('combat-dialogue').innerText = "A fuga falhou! Os inimigos atacam!";
        setTimeout(async () => {
            let msgs = [];
            for (let i = 0; i < aliveEnemies.length; i++) {
                let e = aliveEnemies[i];
                let enemyAtkIds = [1];
                try { enemyAtkIds = JSON.parse(e.data.attacks || '[1]'); } catch (err) { }
                let randomAtkId = enemyAtkIds[Math.floor(Math.random() * enemyAtkIds.length)];

                const resE = await window.pywebview.api.process_battle_turn(e.stats, window.playerFullStats, randomAtkId, 1);

                e.hp = Math.max(0, e.hp - resE.hp_cost);
                e.stamina = Math.max(0, e.stamina - resE.stamina_cost);
                e.mana = Math.max(0, e.mana - resE.mana_cost);

                if (!resE.dodged) {
                    window.playerHP = Math.max(0, window.playerHP - resE.damage);
                    let cssClass = resE.is_crit ? "dmg-crit" : (resE.atk_type === 'mag' ? "dmg-mag" : "dmg-phys");
                    window.showFloatingDamage(`player-container`, resE.damage, cssClass);
                } else {
                    window.showFloatingDamage(`player-container`, "Esquiva!", "dmg-dodge");
                }

                msgs.push(`[${e.data.name}]: ${resE.msg}`);
            }

            updateBattleUI();
            document.getElementById('combat-dialogue').innerText = msgs.join(' | ');
            await window.saveGameState();

            if (window.playerHP <= 0) {
                let ouroPerdido = Math.floor(window.playerGold / 2);
                window.playerGold -= ouroPerdido;
                document.getElementById('combat-dialogue').innerText = `Você morreu. Perdeu ${ouroPerdido} de Ouro!`;
                window.updateHUD();
                await window.saveGameState();

                setTimeout(() => {
                    window.playerHP = window.playerFullStats.computed.hp;
                    window.playerMana = window.playerFullStats.computed.mana;
                    window.playerStamina = window.playerFullStats.computed.stamina;
                    backToCity();
                }, 3500);
            } else {
                window.isTurnBusy = false;
                toggleCombatButtons(false);
            }
        }, 1500);
    }
}