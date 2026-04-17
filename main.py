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

def is_dev_mode():
    """Detecta se está rodando em modo desenvolvimento (via Python) ou como executável."""
    # Quando empacotado pelo PyInstaller, sys.frozen é definido
    return not getattr(sys, 'frozen', False)

def main():
    init_db()
    api = GameAPI()
    html_path = resource_path(os.path.join('frontend', 'index.html'))
    
    window = webview.create_window(
        'RPG Clicker Novel', 
        url=html_path, 
        js_api=api,
        width=1280, 
        height=800,
        min_size=(1024, 768)
    )
    
    def on_loaded():
        # Passa o modo dev para o frontend via JS
        dev_mode = is_dev_mode()
        window.evaluate_js(f'window.__DEV_MODE__ = {str(dev_mode).lower()};')
        window.evaluate_js('if(typeof window.applyDevMode === "function") window.applyDevMode();')
    
    window.events.loaded += on_loaded
    webview.start(debug=is_dev_mode())

if __name__ == '__main__':
    main()
