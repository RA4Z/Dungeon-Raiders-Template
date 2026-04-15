from database.db_manager import insert_item, get_all_items, update_item, delete_item
import json
import random

class GameAPI:
    def __init__(self):
        self.player_damage = 10

    def process_battle_turn(self, player_atk, enemy_atk, player_hp, enemy_hp, attacker):
        """
        attacker: 'player' ou 'enemy'
        Retorna o novo HP e uma mensagem
        """
        if attacker == 'player':
            # Dano flutuante (Ataque +/- 20%)
            damage = int(player_atk * random.uniform(0.8, 1.2))
            new_hp = max(0, enemy_hp - damage)
            return {"new_hp": new_hp, "damage": damage, "msg": f"Você causou {damage} de dano!"}
        else:
            damage = int(enemy_atk * random.uniform(0.8, 1.2))
            new_hp = max(0, player_hp - damage)
            return {"new_hp": new_hp, "damage": damage, "msg": f"O inimigo revidou e causou {damage} de dano!"}

    # Re-inserindo as funções básicas para garantir que o arquivo esteja completo
    def add_entity(self, table, data):
        try:
            if 'equipment_data' in data and isinstance(data['equipment_data'], dict):
                data['equipment_data'] = json.dumps(data['equipment_data'])
            insert_item(table, data)
            return {"status": "success", "message": "Salvo!"}
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
            "characters": get_all_items("characters")
        }
