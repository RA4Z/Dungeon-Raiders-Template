import webview
import os
from database.db_manager import init_db
from api.game_api import GameAPI

def main():
    # Inicializa o banco de dados
    init_db()
    
    # Instancia a API que será exposta para o JS
    api = GameAPI()
    
    # Caminho absoluto para o index.html
    html_path = os.path.join(os.path.dirname(__file__), 'web', 'index.html')
    
    # Cria a janela desktop
    window = webview.create_window(
        'RPG Clicker Novel', 
        url=html_path, 
        js_api=api,
        width=1024, 
        height=768,
        min_size=(800, 600)
    )
    
    # Inicia a aplicação
    webview.start(debug=True) # debug=True permite abrir o inspecionar elemento clicando com botão direito

if __name__ == '__main__':
    main()