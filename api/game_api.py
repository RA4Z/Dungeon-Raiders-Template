# api/game_api.py
from database.db_manager import get_save_connection, get_game_connection, insert_item, get_all_items, update_item, delete_item
from api.stats_engine import StatsEngine
import json
import random
import sqlite3

class GameAPI:

    # ═══════════════════════════════════════════════
    # BATALHA / TURNOS
    # ═══════════════════════════════════════════════
    def process_battle_turn(self, attacker_stats, defender_stats, attack_id, attack_level=1):
        attacks = get_all_items("attacks")
        atk = next((a for a in attacks if str(a['id']) == str(attack_id)), None)
        if not atk:
            atk = {"name":"Ataque Básico","atk_type":"phys","base_power":5,"hp_cost":0,"mana_cost":0,"stamina_cost":5,"description":"","scaling":"{}"}

        atk_type     = atk.get('atk_type', 'phys')
        hp_cost      = int(atk.get('hp_cost', 0))
        mana_cost    = int(atk.get('mana_cost', 0))
        stamina_cost = int(atk.get('stamina_cost', 0))
        base_power   = float(atk.get('base_power', 0)) + ((int(attack_level) - 1) * 0.1)

        try: scaling = json.loads(atk.get('scaling', '{}'))
        except: scaling = {}

        def_des = float(defender_stats['base'].get('des', 1))
        atk_des = float(attacker_stats['base'].get('des', 1))
        dodge_chance = max(5.0, min(80.0, 5.0 + (def_des - atk_des) * 2.0))
        is_dodged = random.uniform(0, 100) <= dodge_chance

        if is_dodged:
            return {"damage":0,"msg":f"{atk['name']} errou!","dodged":True,
                    "hp_cost":hp_cost,"mana_cost":mana_cost,"stamina_cost":stamina_cost,
                    "is_crit":False,"atk_type":atk_type}

        stat_dmg = base_power
        for stat, mult in scaling.items():
            stat_dmg += float(attacker_stats['base'].get(stat, 1)) * float(mult)

        if atk_type == 'phys':
            raw_dmg  = stat_dmg + attacker_stats['computed']['phys_dmg']
            defense  = defender_stats['computed']['phys_res'] * 0.5
        else:
            raw_dmg  = stat_dmg + attacker_stats['computed']['mag_dmg']
            defense  = defender_stats['computed']['mag_res'] * 0.5

        raw_dmg  = raw_dmg - defense
        is_crit  = random.uniform(0, 100) <= attacker_stats['computed']['crit_rate']
        crit_mult= (attacker_stats['computed']['crit_dmg'] / 100.0) if is_crit else 1.0
        damage   = max(1, int(raw_dmg * random.uniform(0.9, 1.1) * crit_mult))
        msg      = f"Usou {atk['name']}! Causou {damage} de dano{(' crítico!' if is_crit else '.')}"

        return {"damage":damage,"msg":msg,"dodged":False,
                "hp_cost":hp_cost,"mana_cost":mana_cost,"stamina_cost":stamina_cost,
                "is_crit":is_crit,"atk_type":atk_type}

    # ═══════════════════════════════════════════════
    # STATS
    # ═══════════════════════════════════════════════
    def compute_full_stats(self, base_stats, equipment_ids, overrides=None):
        bonus = {}
        equipments_db = get_all_items("equipments")
        for eq_id in equipment_ids:
            eq = next((e for e in equipments_db if e['id'] == eq_id), None)
            if eq:
                try: mods = json.loads(eq.get('stats_modifiers', '{}'))
                except: mods = {}
                for k, v in mods.items():
                    bonus[k] = bonus.get(k, 0) + float(v)
        return StatsEngine.calculate_derived(base_stats, bonus, overrides)

    def load_save_full_stats(self, save_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return None
        try: base = json.loads(save['base_stats'])
        except: base = {"for":1,"int":1,"des":1,"car":1,"res":1}
        try: eq_dict = json.loads(save['equipment_data'])
        except: eq_dict = {}
        eq_ids = [int(v) for k, v in eq_dict.items() if str(v).isdigit()]
        b, c = self.compute_full_stats(base, eq_ids)
        return {"base": b, "computed": c}

    def load_enemy_full_stats(self, enemy_id):
        enemy = next((e for e in get_all_items("characters") if e['id'] == enemy_id), None)
        if not enemy: return None
        try: base = json.loads(enemy['base_stats'])
        except: base = {"for":1,"int":1,"des":1,"car":1,"res":1}
        try: overrides = json.loads(enemy['custom_substats'])
        except: overrides = {}
        eq_ids = []
        if enemy['race'] == 'humano':
            try: eq_dict = json.loads(enemy['equipment_data'])
            except: eq_dict = {}
            eq_ids = [int(v) for k, v in eq_dict.items() if str(v).isdigit()]
        b, c = self.compute_full_stats(base, eq_ids, overrides)
        return {"base": b, "computed": c}

    # ═══════════════════════════════════════════════
    # POWER SCORE
    # ═══════════════════════════════════════════════
    def calculate_power_score(self, base_stats):
        return sum(int(v) for v in base_stats.values() if str(v).isdigit())

    def recalculate_all_enemy_scores(self):
        characters = get_all_items("characters")
        for char in characters:
            try: base = json.loads(char.get('base_stats', '{}'))
            except: base = {}
            score = self.calculate_power_score(base)
            try:
                overrides = json.loads(char.get('custom_substats', '{}'))
                hp_override = float(overrides.get('hp', 0))
                if hp_override > 0:
                    score += int(hp_override // 50)
            except: pass
            update_item('characters', char['id'], {'power_score': score})
        return {"status": "success"}

    def get_enemies_for_floor(self, floor):
        characters = get_all_items("characters")
        min_score = max(0, (floor - 1) * 3)
        max_score = floor * 15 + 10
        eligible = [c for c in characters
                    if min_score <= int(c.get('power_score', 0)) <= max_score]
        if not eligible:
            eligible = characters
        return eligible

    def get_random_enemy_for_floor(self, floor):
        eligible = self.get_enemies_for_floor(floor)
        if not eligible: return None
        return random.choice(eligible)

    # ═══════════════════════════════════════════════
    # CRUD GENÉRICO
    # ═══════════════════════════════════════════════
    def add_entity(self, table, data):
        try:
            if table == 'characters' and 'base_stats' in data:
                try:
                    base = json.loads(data['base_stats']) if isinstance(data['base_stats'], str) else data['base_stats']
                    data['power_score'] = self.calculate_power_score(base)
                except: pass
            insert_item(table, data)
            return {"status": "success", "message": "Salvo!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def delete_entity(self, table, item_id):
        try:
            delete_item(table, item_id)
            if table == 'guilds':
                conn = get_game_connection()
                c = conn.cursor()
                c.execute("DELETE FROM guild_quests WHERE guild_id = ?", (item_id,))
                c.execute("DELETE FROM guild_members WHERE guild_id = ?", (item_id,))
                conn.commit(); conn.close()
            return {"status": "success"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def update_entity(self, table, item_id, data):
        try:
            if table == 'characters' and 'base_stats' in data:
                try:
                    base = json.loads(data['base_stats']) if isinstance(data['base_stats'], str) else data['base_stats']
                    data['power_score'] = self.calculate_power_score(base)
                except: pass
            update_item(table, item_id, data)
            return {"status": "success", "message": "Atualizado com sucesso!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def load_data(self):
        return {
            "scenarios":    get_all_items("scenarios"),
            "bodies":       get_all_items("bodies"),
            "equipments":   get_all_items("equipments"),
            "consumables":  get_all_items("consumables"),
            "characters":   get_all_items("characters"),
            "attacks":      get_all_items("attacks"),
            "guilds":       get_all_items("guilds"),
            "guild_quests": get_all_items("guild_quests"),
            "guild_members":get_all_items("guild_members"),
        }

    # ═══════════════════════════════════════════════
    # SAVES
    # ═══════════════════════════════════════════════
    def get_saves(self):
        return get_all_items("saves")

    def create_save(self, name, body_id, face_id, hair_id, skin_color, base_stats):
        try:
            eq_data = {"base": int(body_id), "skin_color": skin_color}
            if face_id: eq_data["face"] = int(face_id)
            if hair_id: eq_data["hair"] = int(hair_id)
            power_score = self.calculate_power_score(base_stats)
            save_data = {
                "name": name, "body_id": int(body_id),
                "equipment_data": json.dumps(eq_data),
                "gold": 0, "current_hp": 9999, "current_mana": 9999, "current_stamina": 9999,
                "base_stats": json.dumps(base_stats),
                "inventory_data": '{"equipments":[],"consumables":{}}',
                "days_passed": 1,
                "stat_exp": '{"for":0,"int":0,"des":0,"car":0,"res":0}',
                "attacks": "[1]",
                "hotbar_data": '[1,null,null,null,null,null,null,null,null,null]',
                "attack_exp": '{"1":{"xp":0,"level":1}}',
                "party_data": "[]",
                "hired_allies": "[]",
                "guild_reputation": "{}",
                "active_quests": "[]",
                "completed_quests": "[]",
                "dungeon_max_floor": 1,
                "dungeon_current_floor": 1,
                "power_score": power_score,
            }
            insert_item('saves', save_data)
            conn = get_save_connection()
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM saves ORDER BY id DESC LIMIT 1")
            new_save = dict(cur.fetchone())
            conn.close()
            return {"status": "success", "save": new_save}
        except Exception as e: return {"status": "error", "message": str(e)}

    def sync_player_state(self, save_id, current_hp, current_mana, current_stamina,
                          gold, inventory_json_str, equipment_data_str, days_passed,
                          base_stats_str, stat_exp_str, attacks_str, hotbar_str,
                          attack_exp_str, party_data_str=None, hired_allies_str=None,
                          guild_reputation_str=None, active_quests_str=None,
                          completed_quests_str=None, dungeon_max_floor=None,
                          dungeon_current_floor=None):
        data = {
            'current_hp': current_hp, 'current_mana': current_mana,
            'current_stamina': current_stamina, 'gold': gold,
            'inventory_data': inventory_json_str, 'equipment_data': equipment_data_str,
            'days_passed': days_passed, 'base_stats': base_stats_str,
            'stat_exp': stat_exp_str, 'attacks': attacks_str,
            'hotbar_data': hotbar_str, 'attack_exp': attack_exp_str,
        }
        if party_data_str         is not None: data['party_data']          = party_data_str
        if hired_allies_str       is not None: data['hired_allies']         = hired_allies_str
        if guild_reputation_str   is not None: data['guild_reputation']     = guild_reputation_str
        if active_quests_str      is not None: data['active_quests']        = active_quests_str
        if completed_quests_str   is not None: data['completed_quests']     = completed_quests_str
        if dungeon_max_floor      is not None: data['dungeon_max_floor']    = dungeon_max_floor
        if dungeon_current_floor  is not None: data['dungeon_current_floor']= dungeon_current_floor

        try:
            base = json.loads(base_stats_str)
            data['power_score'] = self.calculate_power_score(base)
        except: pass

        update_item('saves', save_id, data)
        return {"status": "success"}

    # ═══════════════════════════════════════════════
    # GUILDAS
    # ═══════════════════════════════════════════════
    def get_guild_rank_name(self, guild, rep):
        thresholds = [(500, 5), (200, 4), (75, 3), (20, 2), (0, 1)]
        rank_num = 1
        for threshold, num in thresholds:
            if rep >= threshold:
                rank_num = num
                break
        return guild.get(f'rank_name_{rank_num}', f'Rank {rank_num}'), rank_num

    def accept_quest(self, save_id, quest_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}
        try: active = json.loads(save.get('active_quests', '[]'))
        except: active = []
        try: completed = json.loads(save.get('completed_quests', '[]'))
        except: completed = []
        if quest_id in completed:
            return {"status": "error", "message": "Quest já completada!"}
        if any(q['quest_id'] == quest_id for q in active):
            return {"status": "error", "message": "Quest já aceita!"}
        quest = next((q for q in get_all_items("guild_quests") if q['id'] == quest_id), None)
        if not quest: return {"status": "error", "message": "Quest não encontrada"}
        active.append({"quest_id": quest_id, "guild_id": quest['guild_id'],
                        "kills_done": 0, "started_day": save.get('days_passed', 1)})
        update_item('saves', save_id, {'active_quests': json.dumps(active)})
        return {"status": "success", "message": f"Quest '{quest['name']}' aceita!"}

    def abandon_quest(self, save_id, quest_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}
        try: active = json.loads(save.get('active_quests', '[]'))
        except: active = []
        active = [q for q in active if q['quest_id'] != quest_id]
        update_item('saves', save_id, {'active_quests': json.dumps(active)})
        return {"status": "success"}

    def turn_in_quest(self, save_id, quest_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}
        try: active = json.loads(save.get('active_quests', '[]'))
        except: active = []
        try: completed = json.loads(save.get('completed_quests', '[]'))
        except: completed = []
        try: rep_map = json.loads(save.get('guild_reputation', '{}'))
        except: rep_map = {}

        aq = next((q for q in active if q['quest_id'] == quest_id), None)
        if not aq: return {"status": "error", "message": "Quest não está ativa"}
        quest = next((q for q in get_all_items("guild_quests") if q['id'] == quest_id), None)
        if not quest: return {"status": "error", "message": "Quest não encontrada"}

        required = int(quest.get('required_kills', 0))
        if required > 0 and aq['kills_done'] < required:
            return {"status": "error", "message": f"Kills insuficientes: {aq['kills_done']}/{required}"}

        gold_reward = int(quest.get('gold_reward', 0))
        rep_reward  = int(quest.get('rep_reward', 0))
        guild_id_str = str(quest['guild_id'])

        new_gold = int(save.get('gold', 0)) + gold_reward
        rep_map[guild_id_str] = int(rep_map.get(guild_id_str, 0)) + rep_reward
        active = [q for q in active if q['quest_id'] != quest_id]
        completed.append(quest_id)

        update_item('saves', save_id, {
            'gold': new_gold,
            'active_quests': json.dumps(active),
            'completed_quests': json.dumps(completed),
            'guild_reputation': json.dumps(rep_map),
        })
        return {"status": "success", "gold_reward": gold_reward, "rep_reward": rep_reward,
                "new_gold": new_gold, "new_rep": rep_map[guild_id_str]}

    def update_quest_kills(self, save_id, enemy_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return
        try: active = json.loads(save.get('active_quests', '[]'))
        except: return
        quests_db = get_all_items("guild_quests")
        updated = False
        for aq in active:
            quest = next((q for q in quests_db if q['id'] == aq['quest_id']), None)
            if not quest: continue
            target = int(quest.get('target_character_id', 0))
            if target == 0 or target == enemy_id:
                aq['kills_done'] = aq.get('kills_done', 0) + 1
                updated = True
        if updated:
            update_item('saves', save_id, {'active_quests': json.dumps(active)})

    # ═══════════════════════════════════════════════
    # PARTY / ALIADOS
    # ═══════════════════════════════════════════════
    def hire_ally(self, save_id, member_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}

        members = get_all_items("guild_members")
        member = next((m for m in members if m['id'] == member_id), None)
        if not member: return {"status": "error", "message": "Membro não encontrado"}

        base_cost = int(member.get('hire_cost', 100))

        char = next((c for c in get_all_items("characters") if c['id'] == member['character_id']), None)
        if not char: return {"status": "error", "message": "Personagem do aliado não encontrado"}

        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []

        if any(a['member_id'] == member_id for a in hired):
            return {"status": "error", "message": "Aliado já contratado!"}

        # ── Verifica se precisa pagar penalidade por moral zero ──────────
        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]'))
        except: fired_zero = []

        cost = base_cost * 5 if member_id in fired_zero else base_cost
        gold = int(save.get('gold', 0))

        if gold < cost:
            penalty_note = " (penalidade de moral)" if member_id in fired_zero else ""
            return {"status": "error", "message": f"Ouro insuficiente! Precisa de {cost} moedas{penalty_note}."}

        # Carrega stats completos do aliado
        ally_stats = self.load_enemy_full_stats(char['id'])

        # Calcula custo diário (wage base + soma de stats base)
        try: char_base = json.loads(char.get('base_stats', '{}'))
        except: char_base = {}
        stat_sum   = sum(int(v) for v in char_base.values() if str(v).isdigit())
        daily_cost = int(member.get('daily_wage', 10)) + stat_sum

        hired.append({
            "member_id":          member_id,
            "character_id":       char['id'],
            "name":               char['name'],
            "race":               char['race'],
            "img_front":          char.get('img_front', ''),
            "img_back":           char.get('img_back', ''),
            "equipment_data":     char.get('equipment_data', '{}'),
            "base_stats":         json.loads(char.get('base_stats', '{}')),
            "stat_exp":           {"for":0,"int":0,"des":0,"car":0,"res":0},
            "attacks":            json.loads(char.get('attacks', '[1]')),
            "hotbar":             json.loads(char.get('attacks', '[1]')),
            "hp":                 ally_stats['computed']['hp'] if ally_stats else 100,
            "mana":               ally_stats['computed']['mana'] if ally_stats else 50,
            "stamina":            ally_stats['computed']['stamina'] if ally_stats else 50,
            "daily_wage":         int(member.get('daily_wage', 10)),
            "original_hire_cost": base_cost,    # custo original para penalidade futura
            "routine":            "idle",        # idle | hunt | train
            "train_stat":         "for",         # atributo padrão de treino
            "moral":              100,           # 0–100
        })

        # Remove da lista de moral-zero se foi recontratado
        if member_id in fired_zero:
            fired_zero.remove(member_id)

        new_gold = gold - cost
        update_item('saves', save_id, {
            'gold': new_gold,
            'hired_allies': json.dumps(hired),
            'fired_zero_moral': json.dumps(fired_zero),
        })
        penalty_msg = f" (custo x5 por abandono anterior)" if cost > base_cost else ""
        return {"status": "success", "message": f"{char['name']} contratado!{penalty_msg}", "new_gold": new_gold}

    def fire_ally(self, save_id, member_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []
        try: party = json.loads(save.get('party_data', '[]'))
        except: party = []

        # Verifica se abandonou com moral zero (para penalidade de recontratar)
        ally_leaving = next((a for a in hired if a['member_id'] == member_id), None)
        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]'))
        except: fired_zero = []

        if ally_leaving and int(ally_leaving.get('moral', 100)) <= 0:
            if member_id not in fired_zero:
                fired_zero.append(member_id)

        hired = [a for a in hired if a['member_id'] != member_id]
        party = [p for p in party if p != member_id]

        update_item('saves', save_id, {
            'hired_allies':     json.dumps(hired),
            'party_data':       json.dumps(party),
            'fired_zero_moral': json.dumps(fired_zero),
        })
        return {"status": "success"}

    def set_ally_routine(self, save_id, member_id, routine):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []
        for a in hired:
            if a['member_id'] == member_id:
                a['routine'] = routine
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status": "success"}

    def set_ally_train_stat(self, save_id, member_id, stat_key):
        """Define qual atributo o aliado vai treinar."""
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []
        for a in hired:
            if a['member_id'] == member_id:
                a['train_stat'] = stat_key
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status": "success"}

    def set_ally_hotbar(self, save_id, member_id, hotbar_list):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status": "error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []
        for a in hired:
            if a['member_id'] == member_id:
                a['hotbar'] = hotbar_list
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status": "success"}

    def set_party(self, save_id, member_ids):
        if len(member_ids) > 2:
            return {"status": "error", "message": "Máximo de 2 aliados na party!"}
        update_item('saves', save_id, {'party_data': json.dumps(member_ids)})
        return {"status": "success"}

    def process_daily_routines(self, save_id):
        """
        Processa rotinas dos aliados ao passar 1 dia.
        Inclui: salário + moral + treino com XP (igual ao sistema do player).
        """
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"gold_earned": 0, "messages": []}

        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired = []
        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]'))
        except: fired_zero = []

        gold      = int(save.get('gold', 0))
        messages  = []
        to_fire   = []

        HUNT_GOLD_MIN, HUNT_GOLD_MAX = 15, 45
        TRAIN_XP = 50   # igual ao treino do player no quartel
        XP_PER_LEVEL = 100  # level * 100

        def xp_required(level):
            return level * XP_PER_LEVEL

        for ally in hired:
            cost    = int(ally.get('daily_wage', 10)) + sum(
                int(v) for v in (ally.get('base_stats') or {}).values() if str(v).isdigit()
            )
            moral   = int(ally.get('moral', 100))
            routine = ally.get('routine', 'idle')
            name    = ally['name']

            # ── Pagamento do salário ────────────────────────────────
            if gold >= cost:
                gold -= cost
                # Moral se recupera 5 pontos ao receber pagamento (até 100)
                ally['moral'] = min(100, moral + 5)
            else:
                new_moral = max(0, moral - 10)
                ally['moral'] = new_moral
                if new_moral <= 0:
                    to_fire.append(ally['member_id'])
                    messages.append(f"💔 {name} abandonou a equipe! Moral chegou a zero por falta de pagamento.")
                    continue
                else:
                    messages.append(f"😤 {name} não recebeu pagamento! Moral: {new_moral}/100")

            # ── Rotina diária ───────────────────────────────────────
            if routine == 'hunt':
                earned = random.randint(HUNT_GOLD_MIN, HUNT_GOLD_MAX)
                gold  += earned
                messages.append(f"⚔️ {name} caçou e trouxe {earned} moedas!")

            elif routine == 'train':
                train_stat = ally.get('train_stat', '')
                base_stats = ally.get('base_stats') or {}
                stat_exp   = ally.get('stat_exp')   or {}

                if not train_stat or train_stat not in base_stats:
                    # Escolhe o atributo com menor nível se não configurado
                    train_stat = min(base_stats, key=lambda k: int(base_stats.get(k, 1)))
                    ally['train_stat'] = train_stat

                stat_names = {'for':'Força','int':'Inteligência','des':'Destreza','car':'Carisma','res':'Resistência'}
                stat_name  = stat_names.get(train_stat, train_stat)

                stat_exp[train_stat] = int(stat_exp.get(train_stat, 0)) + TRAIN_XP
                leveled_up = False

                # Loop de level up (igual ao player)
                while True:
                    cur_lvl = int(base_stats.get(train_stat, 1))
                    req     = xp_required(cur_lvl)
                    if stat_exp[train_stat] >= req:
                        stat_exp[train_stat] -= req
                        base_stats[train_stat] = cur_lvl + 1
                        leveled_up = True
                    else:
                        break

                ally['base_stats'] = base_stats
                ally['stat_exp']   = stat_exp

                if leveled_up:
                    new_lvl = int(base_stats[train_stat])
                    messages.append(f"📚 {name} treinou {stat_name} e subiu de nível! (Lv {new_lvl}) 🎉")
                else:
                    messages.append(f"📚 {name} treinou {stat_name}. (+{TRAIN_XP} XP)")

            else:
                messages.append(f"💤 {name} descansou.")

        # ── Remove aliados com moral zero ───────────────────────────
        for member_id in to_fire:
            ally_leaving = next((a for a in hired if a['member_id'] == member_id), None)
            if ally_leaving and member_id not in fired_zero:
                fired_zero.append(member_id)
            hired = [a for a in hired if a['member_id'] != member_id]

        # Atualiza party
        try: party = json.loads(save.get('party_data', '[]'))
        except: party = []
        party = [p for p in party if p not in to_fire]

        update_item('saves', save_id, {
            'gold':             gold,
            'hired_allies':     json.dumps(hired),
            'party_data':       json.dumps(party),
            'fired_zero_moral': json.dumps(fired_zero),
        })
        return {
            "gold_earned": gold - int(save.get('gold', 0)),
            "messages":    messages,
            "new_gold":    gold,
            "fired_allies": to_fire,
        }

    def get_ally_hire_cost(self, save_id, member_id):
        """Retorna o custo de contratação considerando penalidade de moral."""
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)

        members = get_all_items("guild_members")
        member = next((m for m in members if m['id'] == member_id), None)
        if not member: return {"cost": 0, "penalized": False}

        base_cost = int(member.get('hire_cost', 100))

        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]')) if save else []
        except: fired_zero = []

        penalized = member_id in fired_zero
        cost      = base_cost * 5 if penalized else base_cost
        return {"cost": cost, "penalized": penalized, "base_cost": base_cost}

    # ═══════════════════════════════════════════════
    # DUNGEON FLOORS
    # ═══════════════════════════════════════════════
    def get_dungeon_info(self, save_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return None
        return {
            "max_floor":     int(save.get('dungeon_max_floor', 1)),
            "current_floor": int(save.get('dungeon_current_floor', 1)),
        }

    def set_dungeon_floor(self, save_id, floor, is_max=False):
        data = {'dungeon_current_floor': floor}
        if is_max:
            save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
            if save and floor > int(save.get('dungeon_max_floor', 1)):
                data['dungeon_max_floor'] = floor
        update_item('saves', save_id, data)
        return {"status": "success"}

    # ═══════════════════════════════════════════════
    # LOOT & MISC
    # ═══════════════════════════════════════════════
    def get_random_enemy(self, dummy=None):
        conn = get_game_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM characters ORDER BY RANDOM() LIMIT 1')
        enemy = cursor.fetchone()
        conn.close()
        return dict(enemy) if enemy else None

    def generate_loot(self, defeated_enemy_id, save_id):
        saves = get_all_items("saves")
        player_save = next((s for s in saves if s['id'] == save_id), None)
        if not player_save: return {"loot_list":[],"new_inventory":{},"new_gold":0}
        inventory = json.loads(player_save.get('inventory_data') or '{"equipments":[],"consumables":{}}')
        gold = int(player_save.get('gold', 0))
        gold += random.randint(5, 30)
        loot_msgs = ["Ouro Encontrado!"]
        enemy = next((c for c in get_all_items("characters") if c['id'] == defeated_enemy_id), None)
        if enemy:
            if enemy['race'] == 'monstro':
                try: custom_drops = json.loads(enemy.get('custom_drops', '[]'))
                except: custom_drops = []
                for drop in custom_drops:
                    if random.randint(1,100) <= drop.get('chance',0):
                        if drop['type'] == 'cons':
                            inventory['consumables'][str(drop['id'])] = inventory['consumables'].get(str(drop['id']),0)+1
                        elif drop['type'] == 'equip':
                            inventory['equipments'].append(int(drop['id']))
                        loot_msgs.append(f"Drop: {drop['name']}")
            elif enemy['race'] == 'humano':
                try: eq_data = json.loads(enemy.get('equipment_data','{}'))
                except: eq_data = {}
                for slot, eq_id in eq_data.items():
                    if slot not in ['base','face','hair'] and eq_id:
                        if random.randint(1,100) <= 5:
                            inventory['equipments'].append(int(eq_id))
                            loot_msgs.append("Roubado Peça de Equipamento!")
        self.update_quest_kills(save_id, defeated_enemy_id)
        update_item("saves", save_id, {"gold": gold, "inventory_data": json.dumps(inventory)})
        return {"loot_list": loot_msgs, "new_inventory": inventory, "new_gold": gold}