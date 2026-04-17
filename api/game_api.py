from database.db_manager import get_save_connection, get_game_connection, insert_item, get_all_items, update_item, delete_item
from api.stats_engine import StatsEngine
from api.generators.world_gen import WorldGenerator
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
    # STATS + BÔNUS DE SET
    # ═══════════════════════════════════════════════
    def _get_set_bonus(self, equipment_ids):
        equipments_db = get_all_items("equipments")
        sets_db       = get_all_items("equipment_sets")

        set_counts = {}
        for eq_id in equipment_ids:
            eq = next((e for e in equipments_db if e['id'] == eq_id), None)
            if eq and int(eq.get('set_id', 0)) > 0:
                sid = int(eq['set_id'])
                set_counts[sid] = set_counts.get(sid, 0) + 1

        bonus = {}
        for sid, count in set_counts.items():
            s = next((x for x in sets_db if x['id'] == sid), None)
            if not s: continue
            for threshold in[2, 3, 4, 5, 6]:
                if count >= threshold:
                    try:
                        b = json.loads(s.get(f'bonus_{threshold}', '{}') or '{}')
                        for k, v in b.items():
                            bonus[k] = bonus.get(k, 0) + float(v)
                    except: pass
        return bonus

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

        set_bonus = self._get_set_bonus(equipment_ids)
        for k, v in set_bonus.items():
            bonus[k] = bonus.get(k, 0) + v

        return StatsEngine.calculate_derived(base_stats, bonus, overrides)

    def load_save_full_stats(self, save_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return None
        try: base = json.loads(save['base_stats'])
        except: base = {"for":1,"int":1,"des":1,"car":1,"res":1}
        try: eq_dict = json.loads(save['equipment_data'])
        except: eq_dict = {}
        eq_ids =[int(v) for k, v in eq_dict.items() if str(v).isdigit()]
        b, c = self.compute_full_stats(base, eq_ids)
        return {"base": b, "computed": c}

    def load_enemy_full_stats(self, enemy_id):
        enemy = next((e for e in get_all_items("characters") if e['id'] == enemy_id), None)
        if not enemy: return None
        try: base = json.loads(enemy['base_stats'])
        except: base = {"for":1,"int":1,"des":1,"car":1,"res":1}
        try: overrides = json.loads(enemy['custom_substats'])
        except: overrides = {}
        eq_ids =[]
        if enemy['race'] == 'humano':
            try: eq_dict = json.loads(enemy['equipment_data'])
            except: eq_dict = {}
            eq_ids =[int(v) for k, v in eq_dict.items() if str(v).isdigit()]
        b, c = self.compute_full_stats(base, eq_ids, overrides)
        return {"base": b, "computed": c}

    # NOVA FUNÇÃO PARA CARREGAR STATUS DO ALIADO GERADO PROCEDURALMENTE
    def load_ally_full_stats(self, save_id, member_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return None
        
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]
        
        ally = next((a for a in hired if str(a.get('member_id')) == str(member_id)), None)
        if not ally: return None
        
        base = ally.get('base_stats', {"for":1,"int":1,"des":1,"car":1,"res":1})
        if isinstance(base, str):
            try: base = json.loads(base)
            except: base = {"for":1,"int":1,"des":1,"car":1,"res":1}
            
        eq_dict = ally.get('equipment_data', '{}')
        if isinstance(eq_dict, str):
            try: eq_dict = json.loads(eq_dict)
            except: eq_dict = {}
            
        eq_ids =[int(v) for k, v in eq_dict.items() if str(v).isdigit()]
        b, c = self.compute_full_stats(base, eq_ids)
        return {"base": b, "computed": c}

    def get_active_set_bonuses(self, save_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return[]
        try: eq_dict = json.loads(save['equipment_data'])
        except: eq_dict = {}
        eq_ids =[int(v) for k, v in eq_dict.items() if str(v).isdigit()]

        equipments_db = get_all_items("equipments")
        sets_db       = get_all_items("equipment_sets")

        set_counts = {}
        for eq_id in eq_ids:
            eq = next((e for e in equipments_db if e['id'] == eq_id), None)
            if eq and int(eq.get('set_id', 0)) > 0:
                sid = int(eq['set_id'])
                set_counts[sid] = set_counts.get(sid, 0) + 1

        result =[]
        for sid, count in set_counts.items():
            s = next((x for x in sets_db if x['id'] == sid), None)
            if not s: continue
            active_bonuses =[]
            for threshold in[2, 3, 4, 5, 6]:
                if count >= threshold:
                    try:
                        b = json.loads(s.get(f'bonus_{threshold}', '{}') or '{}')
                        if b: active_bonuses.append({"pieces": threshold, "bonus": b})
                    except: pass
            result.append({
                "set_name": s['name'],
                "count": count,
                "active_bonuses": active_bonuses
            })
        return result

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
        monsters =[c for c in characters if str(c.get('race', '')).lower() != 'humano']
        if not monsters:
            return[]
        min_score = max(0, (floor - 1) * 3)
        max_score = floor * 15 + 10
        eligible =[c for c in monsters if min_score <= int(c.get('power_score', 0)) <= max_score]
        if not eligible:
            eligible = monsters
        return eligible

    def get_random_enemy_for_floor(self, floor):
        eligible = self.get_enemies_for_floor(floor)
        if not eligible: return None
        return random.choice(eligible)

    # ═══════════════════════════════════════════════
    # CRUD GENÉRICO E QUESTS
    # ═══════════════════════════════════════════════
    def accept_quest(self, save_id, quest_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}
        try: active_quests = json.loads(save.get('active_quests', '[]'))
        except: active_quests =[]
        if any(str(q['quest_id']) == str(quest_id) for q in active_quests):
            return {"status": "error", "message": "Quest já aceita!"}
        if len(active_quests) >= 5:
            return {"status": "error", "message": "Você só pode ter 5 quests ativas no máximo."}
        quest_data = next((q for q in json.loads(save.get('world_quests', '[]')) if str(q['id']) == str(quest_id)), None)
        if not quest_data:
            return {"status": "error", "message": "Quest não encontrada no mundo."}
        active_quests.append({"quest_id": str(quest_id), "guild_id": str(quest_data['guild_id']), "kills_done": 0})
        update_item('saves', save_id, {'active_quests': json.dumps(active_quests)})
        return {"status": "success"}

    def abandon_quest(self, save_id, quest_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return {"status": "error"}
        try: active_quests = json.loads(save.get('active_quests', '[]'))
        except: active_quests = []
        active_quests =[q for q in active_quests if str(q['quest_id']) != str(quest_id)]
        update_item('saves', save_id, {'active_quests': json.dumps(active_quests)})
        return {"status": "success"}

    def turn_in_quest(self, save_id, quest_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return {"status": "error", "message": "Save não encontrado"}
        try: active_quests = json.loads(save.get('active_quests', '[]'))
        except: active_quests =[]
        try: completed_quests = json.loads(save.get('completed_quests', '[]'))
        except: completed_quests =[]
        quest_state = next((q for q in active_quests if str(q['quest_id']) == str(quest_id)), None)
        if not quest_state: return {"status": "error", "message": "Quest não está ativa."}
        quest_data = next((q for q in json.loads(save.get('world_quests', '[]')) if str(q['id']) == str(quest_id)), None)
        if not quest_data: return {"status": "error", "message": "Quest não encontrada no mundo."}
        if int(quest_data.get('required_kills') or 0) > int(quest_state.get('kills_done') or 0):
            return {"status": "error", "message": "Objetivos da quest não foram concluídos."}
        gold = int(save.get('gold', 0)) + int(quest_data.get('gold_reward', 0))
        try: rep_map = json.loads(save.get('guild_reputation', '{}'))
        except: rep_map = {}
        guild_id = str(quest_data['guild_id'])
        rep_map[guild_id] = int(rep_map.get(guild_id, 0)) + int(quest_data.get('rep_reward', 0))
        active_quests =[q for q in active_quests if str(q['quest_id']) != str(quest_id)]
        completed_quests.append(str(quest_id))
        update_item('saves', save_id, {'active_quests': json.dumps(active_quests), 'completed_quests': json.dumps(completed_quests), 'gold': gold, 'guild_reputation': json.dumps(rep_map)})
        return {"status": "success", "new_gold": gold, "new_rep": rep_map[guild_id], "gold_reward": quest_data.get('gold_reward', 0), "rep_reward": quest_data.get('rep_reward', 0)}

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
            "scenarios":       get_all_items("scenarios"),
            "bodies":          get_all_items("bodies"),
            "equipments":      get_all_items("equipments"),
            "consumables":     get_all_items("consumables"),
            "characters":      get_all_items("characters"),
            "attacks":         get_all_items("attacks"),
            "guilds":          get_all_items("guilds"),
            "guild_quests":    get_all_items("guild_quests"),
            "guild_members":   get_all_items("guild_members"),
            "equipment_sets":  get_all_items("equipment_sets"),
        }

    # ═══════════════════════════════════════════════
    # SAVES
    # ═══════════════════════════════════════════════
    def get_saves(self):
        return get_all_items("saves")

    def create_save(self, name, body_id, face_id, hair_id, skin_color, base_stats, gender='male', num_guilds=6, num_npcs=100):
        try:
            eq_data = {"base": int(body_id), "skin_color": skin_color}
            if face_id: eq_data["face"] = int(face_id)
            if hair_id: eq_data["hair"] = int(hair_id)
            power_score = self.calculate_power_score(base_stats)
            
            generator = WorldGenerator(self.load_data())
            guilds, members, quests = generator.generate_world(int(num_guilds), int(num_npcs))
            
            save_data = {
                "name": name, "body_id": int(body_id),
                "equipment_data": json.dumps(eq_data),
                "inventory_data": json.dumps({"equipments":[], "consumables": {}}),
                "base_stats": json.dumps(base_stats),
                "stat_exp": json.dumps({"for":0,"int":0,"des":0,"car":0,"res":0}),
                "attacks": json.dumps([1]),
                "hotbar_data": json.dumps([1,None,None,None,None,None,None,None,None,None]),
                "attack_exp": json.dumps({"1":{"xp":0,"level":1}}),
                "power_score": power_score,
                "gender": gender,
                "world_guilds": json.dumps(guilds),
                "world_members": json.dumps([m for m in members if m]),
                "world_quests": json.dumps(quests),
                "gold": 0, "days_passed": 1, "current_hp": 100, 
                "current_mana": 9999, "current_stamina": 9999
            }
            insert_item('saves', save_data)
            
            saves = get_all_items("saves")
            new_save = saves[-1]
            return {"status": "success", "save": new_save}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def sync_player_state(self, save_id, hp, mana, stamina, gold,
                          inventory_str, equipment_str,
                          days_passed, base_stats_str, stat_exp_str,
                          attacks_str, hotbar_str, attack_exp_str,
                          party_data_str=None, hired_allies_str=None,
                          guild_rep_str=None, active_quests_str=None,
                          completed_quests_str=None,
                          dungeon_max_floor=1, dungeon_current_floor=1):
        data = {
            'current_hp': hp, 'current_mana': mana, 'current_stamina': stamina,
            'gold': gold, 'inventory_data': inventory_str,
            'equipment_data': equipment_str, 'days_passed': days_passed,
            'base_stats': base_stats_str,
            'stat_exp': stat_exp_str, 'attacks': attacks_str,
            'hotbar_data': hotbar_str, 'attack_exp': attack_exp_str,
            'dungeon_max_floor': dungeon_max_floor,
            'dungeon_current_floor': dungeon_current_floor,
        }
        if party_data_str       is not None: data['party_data']         = party_data_str
        if hired_allies_str     is not None: data['hired_allies']       = hired_allies_str
        if guild_rep_str        is not None: data['guild_reputation']   = guild_rep_str
        if active_quests_str    is not None: data['active_quests']      = active_quests_str
        if completed_quests_str is not None: data['completed_quests']   = completed_quests_str
        update_item('saves', save_id, data)
        return {"status": "success"}

    def get_dungeon_info(self, save_id):
        save = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not save: return None
        return {"max_floor": save.get('dungeon_max_floor', 1),
                "current_floor": save.get('dungeon_current_floor', 1)}

    def set_dungeon_floor(self, save_id, floor, is_new_max=False):
        data = {'dungeon_current_floor': floor}
        if is_new_max: data['dungeon_max_floor'] = floor
        update_item('saves', save_id, data)
        return {"status": "success"}

    # ═══════════════════════════════════════════════
    # ALIADOS
    # ═══════════════════════════════════════════════
    def hire_ally(self, save_id, member_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status":"error","message":"Save não encontrado"}

        world_members = json.loads(save.get('world_members', '[]'))
        member = next((m for m in world_members if str(m['id']) == str(member_id)), None)
        if not member: return {"status":"error","message":"Aliado não encontrado no mundo"}

        gold = int(save.get('gold', 0))
        cost_info = self.get_ally_hire_cost(save_id, member_id)
        hire_cost = cost_info["cost"]

        if gold < hire_cost:
            return {"status":"error","message":f"Ouro insuficiente! Precisa de {hire_cost}"}

        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]

        if any(str(a['member_id']) == str(member_id) for a in hired):
            return {"status":"error","message":"Aliado já contratado"}

        gold -= hire_cost

        try: base_stats = json.loads(member.get('base_stats', '{}'))
        except: base_stats = {"for":1,"int":1,"des":1,"car":1,"res":1}
        try: attacks_list = json.loads(member.get('attacks', '[1]'))
        except: attacks_list =[1]

        ally_obj = {
            "member_id":          str(member_id),
            "name":               member['name'],
            "race":               member.get('race', 'humano'),
            "gender":             member.get('gender', 'male'),
            "equipment_data":     member.get('equipment_data', '{}'),
            "base_stats":         base_stats,
            "stat_exp":           {"for":0,"int":0,"des":0,"car":0,"res":0},
            "attacks":            attacks_list,
            "hotbar":             attacks_list[:10] + [None]*(10-len(attacks_list[:10])),
            "daily_wage":         int(member.get('daily_wage', 10)),
            "original_hire_cost": int(member.get('hire_cost', 100)),
            "moral":              100,
            "routine":            "idle",
            "train_stat":         "for",
            "hp":                 None, "mana": None, "stamina": None,
        }
        hired.append(ally_obj)
        update_item('saves', save_id, {'gold': gold, 'hired_allies': json.dumps(hired)})
        return {"status":"success","new_gold":gold}
    
    def fire_ally(self, save_id, member_id):
        saves = get_all_items("saves")
        save  = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status":"error"}

        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]

        hired =[a for a in hired if str(a['member_id']) != str(member_id)]

        try: party = json.loads(save.get('party_data', '[]'))
        except: party =[]
        party =[p for p in party if str(p) != str(member_id)]

        update_item('saves', save_id, {
            'hired_allies': json.dumps(hired),
            'party_data':   json.dumps(party),
        })
        return {"status":"success"}

    def set_party(self, save_id, party_list):
        update_item('saves', save_id, {'party_data': json.dumps(party_list)})
        return {"status":"success"}

    def set_ally_routine(self, save_id, member_id, routine):
        saves = get_all_items("saves")
        save  = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status":"error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]
        for a in hired:
            if str(a['member_id']) == str(member_id):
                a['routine'] = routine
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status":"success"}

    def set_ally_train_stat(self, save_id, member_id, stat_key):
        saves = get_all_items("saves")
        save  = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status":"error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]
        for a in hired:
            if str(a['member_id']) == str(member_id):
                a['train_stat'] = stat_key
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status":"success"}

    def set_ally_hotbar(self, save_id, member_id, hotbar_list):
        saves = get_all_items("saves")
        save  = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"status":"error"}
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]
        while len(hotbar_list) < 10:
            hotbar_list.append(None)
        hotbar_list = hotbar_list[:10]
        for a in hired:
            if str(a['member_id']) == str(member_id):
                a['hotbar'] = hotbar_list
                break
        update_item('saves', save_id, {'hired_allies': json.dumps(hired)})
        return {"status":"success"}

    def get_ally_hire_cost(self, save_id, member_id):
        saves = get_all_items("saves")
        save = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"cost": 100, "penalized": False}

        world_members = json.loads(save.get('world_members', '[]'))
        member = next((m for m in world_members if str(m['id']) == str(member_id)), None)
        if not member: return {"cost": 100, "penalized": False}

        base_cost = int(member.get('hire_cost', 100))
        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]'))
        except: fired_zero =[]

        if str(member_id) in fired_zero:
            return {"cost": base_cost * 5, "penalized": True}
            
        return {"cost": base_cost, "penalized": False}

    # ═══════════════════════════════════════════════
    # ROTINAS DIÁRIAS E MUNDO VIVO
    # ═══════════════════════════════════════════════
    def process_daily_routines(self, save_id):
        saves = get_all_items("saves")
        save  = next((s for s in saves if s['id'] == save_id), None)
        if not save: return {"gold_earned": 0, "messages":[]}

        # ── 1. ALIADOS CONTRATADOS DO JOGADOR ──────────────────────────
        try: hired = json.loads(save.get('hired_allies', '[]'))
        except: hired =[]
        try: fired_zero = json.loads(save.get('fired_zero_moral', '[]'))
        except: fired_zero =[]

        gold = int(save.get('gold', 0))
        messages =[]
        to_fire =[]

        for ally in hired:
            try:
                cost = int(ally.get('daily_wage', 10)) + sum(int(v) for v in (ally.get('base_stats') or {}).values() if str(v).isdigit())
                moral = int(ally.get('moral', 100))
                routine = ally.get('routine', 'idle')
                name = ally['name']

                if gold >= cost:
                    gold -= cost
                    ally['moral'] = min(100, moral + 5)
                else:
                    new_moral = max(0, moral - 10)
                    ally['moral'] = new_moral
                    if new_moral <= 0:
                        to_fire.append(str(ally['member_id']))
                        messages.append(f"💔 {name} abandonou a equipe! Moral chegou a zero.")
                        continue
                    else:
                        messages.append(f"😤 {name} não recebeu pagamento! Moral: {new_moral}/100")

                if routine == 'hunt':
                    earned = random.randint(15, 45)
                    gold += earned
                    messages.append(f"⚔️ {name} caçou e trouxe {earned} moedas!")
                elif routine == 'train':
                    base_stats = ally.get('base_stats') or {}
                    stat_exp = ally.get('stat_exp', {})
                    if not isinstance(stat_exp, dict): stat_exp = {}
                    
                    train_stat = ally.get('train_stat', 'for')
                    
                    stat_exp[train_stat] = int(stat_exp.get(train_stat, 0)) + 50
                    leveled_up = False
                    
                    while stat_exp[train_stat] >= (int(base_stats.get(train_stat, 1)) * 100):
                        stat_exp[train_stat] -= (int(base_stats.get(train_stat, 1)) * 100)
                        base_stats[train_stat] = int(base_stats.get(train_stat, 1)) + 1
                        leveled_up = True
                        
                    ally['base_stats'] = base_stats
                    ally['stat_exp'] = stat_exp
                    if leveled_up: messages.append(f"📚 {name} treinou e subiu {train_stat} para Lv {base_stats[train_stat]}!")
            except Exception as e:
                pass

        for member_id in to_fire:
            if str(member_id) not in fired_zero: fired_zero.append(str(member_id))
            hired =[a for a in hired if str(a['member_id']) != str(member_id)]

        try: party = json.loads(save.get('party_data', '[]'))
        except: party =[]
        party =[p for p in party if str(p) not in to_fire]

        # ── 2. MUNDO VIVO — NPCs NÃO CONTRATADOS ───────────────────────
        try: world_members = json.loads(save.get('world_members', '[]'))
        except: world_members =[]
        try: world_quests = json.loads(save.get('world_quests', '[]'))
        except: world_quests =[]
        try: world_guilds = json.loads(save.get('world_guilds', '[]'))
        except: world_guilds =[]
        try: active_quests = json.loads(save.get('active_quests', '[]'))
        except: active_quests =[]
        try: guild_reputation = json.loads(save.get('guild_reputation', '{}'))
        except: guild_reputation ={}

        all_equips = get_all_items("equipments")
        all_atks   = get_all_items("attacks")
        world_events =[]

        player_active_quest_ids = {str(q['quest_id']) for q in active_quests}
        hired_member_ids = {str(a['member_id']) for a in hired}

        STAT_NAMES = {"for":"Força","int":"Inteligência","des":"Destreza","car":"Carisma","res":"Resistência"}

        for npc in world_members:
            if str(npc.get('id', '')) in hired_member_ids:
                continue

            if random.random() >= 0.15:
                continue
            
            try:
                event_type = random.choices(['earn_gold', 'skill_levelup', 'stat_up', 'find_item', 'learn_skill', 'hurt'],
                    weights=[30, 20, 10, 20, 10, 10]
                )[0]

                power = int(npc.get('power_score') or 5)

                if event_type == 'earn_gold':
                    base_earn = max(10, power * random.randint(3, 8))
                    earned = int(base_earn * random.uniform(0.8, 1.2))
                    npc['gold'] = int(npc.get('gold') or 0) + earned
                    if earned > 80 and power > 20:
                        world_events.append(f"{npc['name']} voltou de uma caçada lucrativa com {earned} moedas.")

                elif event_type == 'skill_levelup':
                    try:
                        npc_atk_ids = json.loads(npc.get('attacks', '[]'))
                    except:
                        npc_atk_ids =[]

                    if npc_atk_ids:
                        chosen_atk_id = str(random.choice(npc_atk_ids))
                        try:
                            atk_exp = json.loads(npc.get('attack_exp', '{}'))
                        except:
                            atk_exp = {}

                        if chosen_atk_id not in atk_exp:
                            atk_exp[chosen_atk_id] = {"xp": 0, "level": 1}

                        xp_gain = random.randint(20, 60)
                        atk_exp[chosen_atk_id]["xp"] += xp_gain

                        current_lvl = int(atk_exp[chosen_atk_id].get("level") or 1)
                        xp_required = current_lvl * 100
                        leveled_up = False
                        while atk_exp[chosen_atk_id]["xp"] >= xp_required:
                            atk_exp[chosen_atk_id]["xp"] -= xp_required
                            atk_exp[chosen_atk_id]["level"] = current_lvl + 1
                            current_lvl = atk_exp[chosen_atk_id]["level"]
                            xp_required = current_lvl * 100
                            leveled_up = True

                        npc['attack_exp'] = json.dumps(atk_exp)

                        if leveled_up and power > 20:
                            atk_obj = next((a for a in all_atks if str(a['id']) == chosen_atk_id), None)
                            atk_name = atk_obj['name'] if atk_obj else f"Habilidade #{chosen_atk_id}"
                            world_events.append(f"Dizem que {npc['name']} dominou o nível {current_lvl} de {atk_name}!")

                elif event_type == 'stat_up':
                    try:
                        b_stats = json.loads(npc.get('base_stats', '{}'))
                        if b_stats:
                            stat = random.choice(list(b_stats.keys()))
                            b_stats[stat] = int(b_stats.get(stat) or 1) + 1
                            npc['base_stats'] = json.dumps(b_stats)
                            npc['power_score'] = sum(int(v or 0) for v in b_stats.values())
                            if npc['power_score'] > 30:
                                world_events.append(f"Boatos: {npc['name']} está mais forte! Sua {STAT_NAMES.get(stat, stat)} cresceu.")
                    except:
                        pass

                elif event_type == 'find_item' and all_equips:
                    new_item = random.choice(all_equips)
                    try:
                        eq_data = json.loads(npc.get('equipment_data', '{}'))
                    except:
                        eq_data = {}
                    slot = new_item['type']
                    if slot not in eq_data or random.random() < 0.2:
                        eq_data[slot] = new_item['id']
                        npc['equipment_data'] = json.dumps(eq_data)
                        world_events.append(f"{npc['name']} encontrou um(a) {new_item['name']} e equipou!")

                elif event_type == 'learn_skill' and all_atks:
                    new_atk = random.choice(all_atks)
                    try:
                        npc_atks = json.loads(npc.get('attacks', '[]'))
                    except:
                        npc_atks = []
                    if new_atk['id'] not in npc_atks:
                        npc_atks.append(new_atk['id'])
                        npc['attacks'] = json.dumps(npc_atks)
                        if power > 30:
                            world_events.append(f"Ouvimos que {npc['name']} aprendeu a técnica {new_atk['name']}!")

                elif event_type == 'hurt':
                    loss = random.randint(10, 50)
                    npc['gold'] = max(0, int(npc.get('gold') or 0) - loss)
                    if power > 30:
                        world_events.append(f"{npc['name']} foi visto(a) gravemente ferido(a) nas cavernas.")
            
            except Exception as e:
                pass

        # ── 2b. SISTEMA DE QUESTS: EXPIRAÇÃO ───────────────────────────
        surviving_quests =[]
        expired_count = 0

        for quest in world_quests:
            try:
                quest_id_str = str(quest.get('id', ''))
                time_limit = int(quest.get('time_limit_days') or 0)

                if time_limit <= 0 or quest_id_str in player_active_quest_ids:
                    surviving_quests.append(quest)
                    continue

                new_limit = time_limit - 1
                quest['time_limit_days'] = new_limit

                if new_limit <= 0:
                    expired_count += 1
                else:
                    surviving_quests.append(quest)
            except:
                surviving_quests.append(quest)

        if expired_count > 0:
            world_events.append(f"📋 {expired_count} contrato(s) de guilda expiraram sem ser completados.")

        # ── 2c. CONCLUSÃO DE QUESTS POR NPCs ───────────────────────────
        guild_members_map = {}
        for npc in world_members:
            gid = str(npc.get('guild_id', ''))
            if gid:
                guild_members_map.setdefault(gid,[]).append(npc)

        quests_completed_by_npcs =[]
        for quest in surviving_quests:
            try:
                quest_id_str = str(quest.get('id', ''))
                if quest_id_str in player_active_quest_ids:
                    continue

                guild_id = str(quest.get('guild_id', ''))
                guild_npcs = guild_members_map.get(guild_id,[])
                if not guild_npcs:
                    continue

                completion_chance = min(0.30, len(guild_npcs) * 0.02)
                if random.random() < completion_chance:
                    hero_npc = random.choice(guild_npcs)
                    quests_completed_by_npcs.append(quest_id_str)

                    guild_reputation[guild_id] = int(guild_reputation.get(guild_id) or 0) + int(quest.get('rep_reward') or 10)

                    if int(quest.get('difficulty') or 1) >= 3:
                        guild_obj = next((g for g in world_guilds if str(g.get('id', '')) == guild_id), None)
                        guild_name = guild_obj['name'] if guild_obj else "Uma guilda"
                        world_events.append(f"🏆 {hero_npc['name']} completou a missão \"{quest.get('name', '?')}\" para {guild_name}!")
            except:
                pass

        surviving_quests =[q for q in surviving_quests if str(q.get('id', '')) not in quests_completed_by_npcs]
        world_quests = surviving_quests

        # ── 2d. CICLO DE 30 DIAS: REGENERAÇÃO DE QUESTS ────────────────
        days_passed = int(save.get('days_passed', 1))

        if days_passed > 0 and days_passed % 30 == 0:
            world_quests, world_events = self._regenerate_world_quests(world_guilds, world_quests, player_active_quest_ids, world_events)

        # ── 3. PERSISTÊNCIA: SALVA TUDO ────────────────────────────────
        old_gold = int(save.get('gold', 0))

        update_item('saves', save_id, {
            'gold':             gold,
            'hired_allies':     json.dumps(hired),
            'party_data':       json.dumps(party),
            'fired_zero_moral': json.dumps(fired_zero),
            'world_members':    json.dumps(world_members),
            'world_quests':     json.dumps(world_quests),
            'guild_reputation': json.dumps(guild_reputation),
        })

        if world_events:
            messages.append("--- Boatos do Mundo ---")
            messages.extend(random.sample(world_events, min(len(world_events), 5)))

        return {
            "new_gold":    gold,
            "gold_earned": gold - old_gold,
            "messages":    messages,
            "fired_allies": to_fire,
        }

    # ═══════════════════════════════════════════════
    # REGENERAÇÃO DE QUESTS (CICLO DE 30 DIAS)
    # ═══════════════════════════════════════════════
    def _regenerate_world_quests(self, world_guilds, world_quests, player_active_quest_ids, world_events):
        kept_quests =[q for q in world_quests if str(q.get('id', '')) in player_active_quest_ids]
        try:
            game_data = self.load_data()
            generator = WorldGenerator(game_data)
            new_quests = generator.generate_quests_for_guilds(world_guilds)
            kept_quests.extend(new_quests)

            removed_count = len(world_quests) - len([q for q in world_quests if str(q.get('id', '')) in player_active_quest_ids])
            added_count = len(new_quests)

            world_events.append(f"📅 Ciclo mensal: {removed_count} contrato(s) antigo(s) arquivado(s). {added_count} novo(s) contrato(s) disponível(is) nas guildas!")
        except Exception as e:
            world_events.append(f"[Erro na regeneração de quests: {e}]")

        return kept_quests, world_events

    # ═══════════════════════════════════════════════
    # LOOT / INVENTÁRIO
    # ═══════════════════════════════════════════════
    def generate_loot(self, enemy_id, save_id):
        enemy = next((e for e in get_all_items("characters") if e['id'] == enemy_id), None)
        save  = next((s for s in get_all_items("saves") if s['id'] == save_id), None)
        if not enemy or not save:
            return {"loot_list":[], "new_inventory": {"equipments":[], "consumables":{}}, "new_gold": 0}

        try: inventory = json.loads(save['inventory_data'])
        except: inventory = {"equipments":[], "consumables": {}}
        gold = int(save.get('gold', 0))

        loot_list  =[]
        gold_drop  = random.randint(5, 20)
        gold      += gold_drop
        loot_list.append(f"🪙 {gold_drop} moedas de ouro")

        try: custom_drops = json.loads(enemy.get('custom_drops', '[]'))
        except: custom_drops =[]

        if custom_drops:
            for drop in custom_drops:
                roll = random.randint(1, 100)
                if roll <= int(drop.get('chance', 10)):
                    dtype = drop.get('type', '')
                    did   = drop.get('id', 0)
                    if dtype == 'equip':
                        item = next((e for e in get_all_items("equipments") if e['id'] == did), None)
                        if item:
                            inventory['equipments'].append(did)
                            loot_list.append(f"⚔️ {item['name']}")
                    elif dtype == 'cons':
                        item = next((c for c in get_all_items("consumables") if c['id'] == did), None)
                        if item:
                            cid = str(did)
                            inventory['consumables'][cid] = inventory['consumables'].get(cid, 0) + 1
                            loot_list.append(f"🧪 {item['name']}")
        else:
            all_equips = get_all_items("equipments")
            all_cons   = get_all_items("consumables")
            for eq in all_equips:
                if random.randint(1, 100) <= int(eq.get('drop_chance', 5)):
                    inventory['equipments'].append(eq['id'])
                    loot_list.append(f"⚔️ {eq['name']}")
            for cons in all_cons:
                if random.randint(1, 100) <= int(cons.get('drop_chance', 10)):
                    cid = str(cons['id'])
                    inventory['consumables'][cid] = inventory['consumables'].get(cid, 0) + 1
                    loot_list.append(f"🧪 {cons['name']}")

        update_item('saves', save_id, {
            'gold':           gold,
            'inventory_data': json.dumps(inventory)
        })
        return {"loot_list": loot_list, "new_inventory": inventory, "new_gold": gold}
