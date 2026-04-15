from database.db_manager import get_connection, insert_item, get_all_items, update_item, delete_item
import json
import random
import sqlite3

class GameAPI:
    def process_battle_turn(self, player_atk, enemy_atk, player_hp, enemy_hp, attacker):
        if attacker == 'player':
            damage = int(player_atk * random.uniform(0.8, 1.2))
            new_hp = max(0, enemy_hp - damage)
            return {"new_hp": new_hp, "damage": damage, "msg": f"Você causou {damage} de dano!"}
        else:
            damage = int(enemy_atk * random.uniform(0.8, 1.2))
            new_hp = max(0, player_hp - damage)
            return {"new_hp": new_hp, "damage": damage, "msg": f"O inimigo revidou com {damage} de dano!"}

    def add_entity(self, table, data):
        try:
            if 'equipment_data' in data and isinstance(data['equipment_data'], dict):
                data['equipment_data'] = json.dumps(data['equipment_data'])
            insert_item(table, data)
            return {"status": "success", "message": "Salvo com sucesso!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def update_entity(self, table, item_id, data):
        try:
            if 'equipment_data' in data and isinstance(data['equipment_data'], dict):
                data['equipment_data'] = json.dumps(data['equipment_data'])
            update_item(table, item_id, data)
            return {"status": "success"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def delete_entity(self, table, item_id):
        try:
            delete_item(table, item_id)
            return {"status": "success"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def load_data(self):
        save_data = get_all_items("player_save")
        player_save = save_data[0] if save_data else {"gold": 0, "current_hp": 100, "inventory_data": '{"equipments":[], "consumables": {}}'}

        return {
            "scenarios": get_all_items("scenarios"),
            "bodies": get_all_items("bodies"),
            "equipments": get_all_items("equipments"),
            "consumables": get_all_items("consumables"),
            "characters": get_all_items("characters"),
            "save": player_save
        }
    
    def sync_player_state(self, char_id, current_hp, inventory_json_str, equipment_data_str):
        update_item('characters', char_id, {'equipment_data': equipment_data_str})
        update_item('player_save', 1, {'current_hp': current_hp, 'inventory_data': inventory_json_str, 'active_character_id': char_id})
        return {"status": "success"}

    def get_random_enemy(self, player_id):
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM characters WHERE id != ? ORDER BY RANDOM() LIMIT 1', (player_id,))
        enemy = cursor.fetchone()
        conn.close()
        return dict(enemy) if enemy else None

    # MODIFICADO: Agora recebe o ID do inimigo derrotado
    def generate_loot(self, defeated_enemy_id):
        saves = get_all_items("player_save")
        player_save = saves[0]
        
        inventory = json.loads(player_save['inventory_data'] or '{"equipments":[], "consumables": {}}')
        gold = player_save.get('gold', 0)
        
        # Ouro Base Sempre
        gained_gold = random.randint(5, 30)
        gold += gained_gold
        loot_msgs = [f"{gained_gold} Moedas de Ouro"]
        
        # Encontra os dados do Inimigo Morto
        enemy = None
        for char in get_all_items("characters"):
            if char['id'] == defeated_enemy_id:
                enemy = char
                break
                
        if enemy:
            if enemy['race'] == 'monstro':
                # Processa os Drops Customizados do Monstro
                try:
                    custom_drops = json.loads(enemy.get('custom_drops', '[]'))
                except:
                    custom_drops =[]
                    
                for drop in custom_drops:
                    if random.randint(1, 100) <= drop.get('chance', 0):
                        if drop['type'] == 'cons':
                            c_id = str(drop['id'])
                            inventory['consumables'][c_id] = inventory['consumables'].get(c_id, 0) + 1
                            loot_msgs.append(f"1x {drop['name']} ({drop['chance']}%)")
                        elif drop['type'] == 'equip':
                            inventory['equipments'].append(int(drop['id']))
                            loot_msgs.append(f"Equipamento: {drop['name']} ({drop['chance']}%)")
                            
            elif enemy['race'] == 'humano':
                # Processa a chance de 5% de dropar equipamento do Humanoide (exceto base, face, hair)
                try:
                    eq_data = json.loads(enemy.get('equipment_data', '{}'))
                except:
                    eq_data = {}
                    
                excluded_slots = ['base', 'face', 'hair']
                equipments_db = get_all_items("equipments")
                
                for slot, eq_id in eq_data.items():
                    if slot not in excluded_slots and eq_id:
                        # Rola os 5% de chance
                        if random.randint(1, 100) <= 5:
                            eq_name = "Equipamento Desconhecido"
                            for e in equipments_db:
                                if e['id'] == int(eq_id):
                                    eq_name = e['name']
                                    break
                            
                            inventory['equipments'].append(int(eq_id))
                            loot_msgs.append(f"Roubado: {eq_name} (Drop de 5%)")
                
        # Salva o resultado final no banco
        update_item("player_save", 1, {
            "gold": gold,
            "inventory_data": json.dumps(inventory)
        })
                
        return {
            "loot_list": loot_msgs, 
            "new_inventory": inventory,
            "new_gold": gold
        }