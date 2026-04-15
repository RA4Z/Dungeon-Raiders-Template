from database.db_manager import insert_item, get_all_items, update_item, delete_item
import json
import webview
import os

class GameAPI:
    def __init__(self):
        self.current_enemy_hp = 0
        self.player_damage = 10

    # -------- NOVA FUNÇÃO: ABRIR SELETOR DE ARQUIVOS --------
    def pick_image(self):
        try:
            # Pega a janela ativa do aplicativo
            window = webview.windows[0]
            # Abre o seletor do Windows limitando a imagens
            result = window.create_file_dialog(webview.OPEN_DIALOG, file_types=('Imagens (*.png;*.jpg;*.jpeg;*.gif)',))
            
            if result and len(result) > 0:
                file_path = result[0].replace("\\", "/")
                # Pega a pasta 'web' do seu projeto para calcular o caminho relativo
                web_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web')).replace("\\", "/")
                
                # Se a imagem escolhida já estiver dentro da sua pasta 'assets', retorna só o caminho bonitinho
                if file_path.startswith(web_dir):
                    return file_path.replace(web_dir + "/", "")
                else:
                    # Se for uma imagem de fora do projeto, retorna o caminho local absoluto do PC
                    return f"file:///{file_path}"
            return None
        except Exception as e:
            print("Erro ao selecionar imagem:", e)
            return None
    # ---------------------------------------------------------

    def add_entity(self, table, data):
        try:
            if 'equipment_data' in data and isinstance(data['equipment_data'], dict):
                data['equipment_data'] = json.dumps(data['equipment_data'])
            insert_item(table, data)
            return {"status": "success", "message": f"Item salvo em {table}!"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def update_entity(self, table, item_id, data):
        try:
            if 'equipment_data' in data and isinstance(data['equipment_data'], dict):
                data['equipment_data'] = json.dumps(data['equipment_data'])
            update_item(table, item_id, data)
            return {"status": "success", "message": f"Item {item_id} atualizado!"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def delete_entity(self, table, item_id):
        try:
            delete_item(table, item_id)
            return {"status": "success", "message": f"Item deletado com sucesso!"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def load_data(self):
        return {
            "scenarios": get_all_items("scenarios"),
            "bodies": get_all_items("bodies"),
            "equipments": get_all_items("equipments"),
            "characters": get_all_items("characters")
        }

    def attack_enemy(self, enemy_max_hp, current_hp):
        new_hp = current_hp - self.player_damage
        if new_hp <= 0:
            return {"status": "dead", "new_hp": 0, "message": "Inimigo derrotado!"}
        return {"status": "alive", "new_hp": new_hp, "message": f"Causou {self.player_damage} de dano!"}