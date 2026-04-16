import webview
import os
import sys
from database.db_manager import init_db
from api.game_api import GameAPI


def resource_path(relative_path):
    """ Retorna o caminho absoluto para o recurso, funciona em dev e no PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

def main():
    init_db()
    api = GameAPI()
    # Caminho atualizado para a nova estrutura
    html_path = resource_path(os.path.join('frontend', 'index.html'))
    
    window = webview.create_window(
        'RPG Clicker Novel', 
        url=html_path, 
        js_api=api,
        width=1280, 
        height=800,
        min_size=(1024, 768)
    )
    webview.start(debug=True)

if __name__ == '__main__':
    main()