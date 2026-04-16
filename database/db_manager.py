import sqlite3
import os

# DOIS BANCOS DE DADOS SEPARADOS
GAME_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'game_data.db')
SAVE_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'saves.db')

def get_game_connection():
    os.makedirs(os.path.dirname(GAME_DB_PATH), exist_ok=True)
    return sqlite3.connect(GAME_DB_PATH)

def get_save_connection():
    os.makedirs(os.path.dirname(SAVE_DB_PATH), exist_ok=True)
    return sqlite3.connect(SAVE_DB_PATH)

def _get_conn(table):
    # Se a tabela for 'saves', conecta no banco de saves. Se não, no banco do jogo.
    if table == 'saves': return get_save_connection()
    return get_game_connection()

def init_db():
    # ==== 1. INICIALIZA BANCO DO JOGO (Peças, Monstros, Cenários) ====
    conn = get_game_connection()
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image_path TEXT, description TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, img_front TEXT, img_back TEXT, is_playable INTEGER DEFAULT 0
    )''')
    
    # Migração segura para adicionar a coluna caso o banco já exista
    try: cursor.execute("ALTER TABLE bodies ADD COLUMN is_playable INTEGER DEFAULT 0")
    except sqlite3.OperationalError: pass

    cursor.execute('''CREATE TABLE IF NOT EXISTS equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, type TEXT, img_front TEXT, img_back TEXT,
        def_phys INTEGER, def_mag INTEGER, bonus_str INTEGER, bonus_int INTEGER, bonus_dex INTEGER,
        drop_chance INTEGER DEFAULT 10
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS consumables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, effect_type TEXT, effect_value INTEGER, img_path TEXT, drop_chance INTEGER DEFAULT 20
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, hp INTEGER, attack INTEGER, race TEXT,
        img_front TEXT, img_back TEXT, equipment_data TEXT,
        custom_drops TEXT DEFAULT '[]'
    )''')
    
    try: cursor.execute("ALTER TABLE characters ADD COLUMN custom_drops TEXT DEFAULT '[]'")
    except sqlite3.OperationalError: pass

    conn.commit()
    conn.close()

    # ==== 2. INICIALIZA BANCO DE SAVES (Jogadores) ====
    conn_save = get_save_connection()
    cursor_save = conn_save.cursor()
    
    cursor_save.execute('''CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        body_id INTEGER,
        gold INTEGER DEFAULT 0,
        max_hp INTEGER DEFAULT 100,
        current_hp INTEGER DEFAULT 100,
        attack INTEGER DEFAULT 10,
        equipment_data TEXT DEFAULT '{}',
        inventory_data TEXT DEFAULT '{"equipments":[], "consumables": {}}',
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    conn_save.commit()
    conn_save.close()

def insert_item(table, data_dict):
    conn = _get_conn(table)
    cursor = conn.cursor()
    columns = ', '.join(data_dict.keys())
    placeholders = ', '.join('?' * len(data_dict))
    sql = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'
    cursor.execute(sql, list(data_dict.values()))
    conn.commit()
    conn.close()

def update_item(table, item_id, data_dict):
    conn = _get_conn(table)
    cursor = conn.cursor()
    set_clause = ', '.join([f"{key} = ?" for key in data_dict.keys()])
    sql = f'UPDATE {table} SET {set_clause} WHERE id = ?'
    values = list(data_dict.values())
    values.append(item_id)
    cursor.execute(sql, values)
    conn.commit()
    conn.close()

def delete_item(table, item_id):
    conn = _get_conn(table)
    cursor = conn.cursor()
    cursor.execute(f'DELETE FROM {table} WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()

def get_all_items(table):
    try:
        conn = _get_conn(table)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f'SELECT * FROM {table}')
        rows = cursor.fetchall()
        conn.close()
        return[dict(row) for row in rows]
    except:
        return[]