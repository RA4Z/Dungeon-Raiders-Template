import webview
import os
from database.db_manager import init_db
from api.game_api import GameAPI

def main():
    init_db()
    api = GameAPI()
    # Caminho atualizado para a nova estrutura
    html_path = os.path.join(os.path.dirname(__file__), 'frontend', 'index.html')
    
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