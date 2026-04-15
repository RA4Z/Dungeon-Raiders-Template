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
            return {"status": "success", "message": "Atualizado!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def delete_entity(self, table, item_id):
        try:
            delete_item(table, item_id)
            return {"status": "success", "message": "Deletado!"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def load_data(self):
        return {
            "scenarios": get_all_items("scenarios"),
            "bodies": get_all_items("bodies"),
            "equipments": get_all_items("equipments"),
            "consumables": get_all_items("consumables"),
            "characters": get_all_items("characters")
        }

    # --- NOVAS LÓGICAS PARA O JOGO ---
    
    def get_random_enemy(self, player_id):
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # Seleciona um personagem aleatório que NÃO seja o ID do jogador (para não lutar consigo mesmo)
        cursor.execute('SELECT * FROM characters WHERE id != ? ORDER BY RANDOM() LIMIT 1', (player_id,))
        enemy = cursor.fetchone()
        conn.close()
        return dict(enemy) if enemy else None

    def generate_loot(self):
        # Sorteia Ouro
        gold = random.randint(5, 30)
        loot_msgs = [f"{gold} Moedas de Ouro"]
        
        # Sorteia Consumíveis
        consumables = get_all_items("consumables")
        for item in consumables:
            chance = item.get('drop_chance', 20)
            if random.randint(1, 100) <= chance:
                loot_msgs.append(f"1x {item['name']}")
                
        # Sorteia Equipamentos
        equipments = get_all_items("equipments")
        for eq in equipments:
            chance = eq.get('drop_chance', 5)
            if random.randint(1, 100) <= chance:
                loot_msgs.append(f"Equipamento: {eq['name']}")
                
        return {"gold": gold, "loot_list": loot_msgs, "msg": "Você encontrou: " + ", ".join(loot_msgs)}
    