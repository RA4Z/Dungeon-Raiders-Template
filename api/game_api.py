# api/game_api.py
from database.db_manager import get_save_connection, get_game_connection, insert_item, get_all_items, update_item, delete_item
from api.stats_engine import StatsEngine
import json
import random
import sqlite3

class GameAPI:
    def process_battle_turn(self, attacker_stats, defender_stats, atk_type='phys'):
        # atk_type pode ser 'phys' (Físico) ou 'mag' (Mágico)
        is_crit = random.uniform(0, 100) <= attacker_stats['computed']['crit_rate']
        crit_mult = (attacker_stats['computed']['crit_dmg'] / 100.0) if is_crit else 1.0

        if atk_type == 'phys':
            raw_dmg = attacker_stats['computed']['phys_dmg'] - (defender_stats['computed']['phys_res'] * 0.5)
        else:
            raw_dmg = attacker_stats['computed']['mag_dmg'] - (defender_stats['computed']['mag_res'] * 0.5)

        # Dano tem flutuação de 10% e nunca é menor que 1
        damage = max(1, int(raw_dmg * random.uniform(0.9, 1.1) * crit_mult))
        
        msg = f"Causou {damage} de Dano {('Crítico!' if is_crit else '')}"
        return {"damage": damage, "msg": msg}

    def compute_full_stats(self, base_stats, equipment_ids, overrides=None):
        # Soma bônus de todos os equipamentos usando JSON
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

        eq_ids = []
        if enemy['race'] == 'humano':
            try: eq_dict = json.loads(enemy['equipment_data'])
            except: eq_dict = {}
            eq_ids =[int(v) for k, v in eq_dict.items() if str(v).isdigit()]

        b, c = self.compute_full_stats(base, eq_ids, overrides)
        return {"base": b, "computed": c}

    # === DEMAIS FUNÇÕES ===
    def add_entity(self, table, data):
        try:
            insert_item(table, data)
            return {"status": "success", "message": "Salvo!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def delete_entity(self, table, item_id):
        try:
            delete_item(table, item_id)
            return {"status": "success"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def load_data(self):
        return {
            "scenarios": get_all_items("scenarios"),
            "bodies": get_all_items("bodies"),
            "equipments": get_all_items("equipments"),
            "consumables": get_all_items("consumables"),
            "characters": get_all_items("characters")
        }

    def get_saves(self):
        return get_all_items("saves")

    def create_save(self, name, body_id, face_id, hair_id, skin_color, base_stats):
        try:
            eq_data = {"base": int(body_id), "skin_color": skin_color}
            if face_id: eq_data["face"] = int(face_id)
            if hair_id: eq_data["hair"] = int(hair_id)

            save_data = {
                "name": name, "body_id": int(body_id), "equipment_data": json.dumps(eq_data),
                "gold": 0, "current_hp": 9999, # O Front end corrigirá isso ao carregar
                "base_stats": json.dumps(base_stats),
                "inventory_data": '{"equipments":[], "consumables": {}}'
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

    def sync_player_state(self, save_id, current_hp, inventory_json_str, equipment_data_str):
        update_item('saves', save_id, {
            'current_hp': current_hp, 'inventory_data': inventory_json_str, 'equipment_data': equipment_data_str
        })
        return {"status": "success"}

    def get_random_enemy(self, dummy=None):
        conn = get_game_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM characters ORDER BY RANDOM() LIMIT 1')
        enemy = cursor.fetchone()
        conn.close()
        return dict(enemy) if enemy else None

    def generate_loot(self, defeated_enemy_id, save_id):
        # Mesmo código da versão anterior para loot
        saves = get_all_items("saves")
        player_save = next((s for s in saves if s['id'] == save_id), None)
        if not player_save: return {"loot_list":[], "new_inventory": {}, "new_gold": 0}
        
        inventory = json.loads(player_save['inventory_data'] or '{"equipments":[], "consumables": {}}')
        gold = player_save.get('gold', 0)
        gold += random.randint(5, 30)
        loot_msgs =[f"Ouro Encontrado!"]
        
        enemy = next((char for char in get_all_items("characters") if char['id'] == defeated_enemy_id), None)
        if enemy:
            if enemy['race'] == 'monstro':
                try: custom_drops = json.loads(enemy.get('custom_drops', '[]'))
                except: custom_drops =[]
                for drop in custom_drops:
                    if random.randint(1, 100) <= drop.get('chance', 0):
                        if drop['type'] == 'cons':
                            inventory['consumables'][str(drop['id'])] = inventory['consumables'].get(str(drop['id']), 0) + 1
                        elif drop['type'] == 'equip':
                            inventory['equipments'].append(int(drop['id']))
                        loot_msgs.append(f"Drop: {drop['name']}")
            elif enemy['race'] == 'humano':
                try: eq_data = json.loads(enemy.get('equipment_data', '{}'))
                except: eq_data = {}
                for slot, eq_id in eq_data.items():
                    if slot not in ['base', 'face', 'hair'] and eq_id:
                        if random.randint(1, 100) <= 5:
                            inventory['equipments'].append(int(eq_id))
                            loot_msgs.append(f"Roubado Peça de Equipamento!")
                
        update_item("saves", save_id, {"gold": gold, "inventory_data": json.dumps(inventory)})
        return {"loot_list": loot_msgs, "new_inventory": inventory, "new_gold": gold}