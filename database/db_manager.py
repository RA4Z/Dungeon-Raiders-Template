# database/db_manager.py
import sqlite3
import os

GAME_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'game_data.db')
SAVE_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'saves.db')

def get_game_connection():
    os.makedirs(os.path.dirname(GAME_DB_PATH), exist_ok=True)
    return sqlite3.connect(GAME_DB_PATH)

def get_save_connection():
    os.makedirs(os.path.dirname(SAVE_DB_PATH), exist_ok=True)
    return sqlite3.connect(SAVE_DB_PATH)

def _get_conn(table):
    if table == 'saves': return get_save_connection()
    return get_game_connection()

def run_migration(conn, sql):
    try: conn.cursor().execute(sql)
    except sqlite3.OperationalError: pass

def init_db():
    conn = get_game_connection()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scenarios (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image_path TEXT, description TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS bodies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, img_front TEXT, img_back TEXT, is_playable INTEGER DEFAULT 0)''')
    run_migration(conn, "ALTER TABLE bodies ADD COLUMN is_playable INTEGER DEFAULT 0")

    c.execute('''CREATE TABLE IF NOT EXISTS equipments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, img_front TEXT, img_back TEXT, drop_chance INTEGER DEFAULT 10, stats_modifiers TEXT DEFAULT '{}')''')
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN stats_modifiers TEXT DEFAULT '{}'")

    c.execute('''CREATE TABLE IF NOT EXISTS consumables (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, effect_type TEXT, effect_value INTEGER, img_path TEXT, drop_chance INTEGER DEFAULT 20)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS characters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, race TEXT, img_front TEXT, img_back TEXT, equipment_data TEXT, custom_drops TEXT DEFAULT '[]', base_stats TEXT DEFAULT '{}', custom_substats TEXT DEFAULT '{}')''')
    run_migration(conn, "ALTER TABLE characters ADD COLUMN custom_drops TEXT DEFAULT '[]'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN base_stats TEXT DEFAULT '{}'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN custom_substats TEXT DEFAULT '{}'")
    conn.commit()
    conn.close()

    conn_save = get_save_connection()
    c_save = conn_save.cursor()
    c_save.execute('''CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, body_id INTEGER, gold INTEGER DEFAULT 0,
        current_hp INTEGER DEFAULT 100, equipment_data TEXT DEFAULT '{}',
        inventory_data TEXT DEFAULT '{"equipments":[], "consumables": {}}',
        base_stats TEXT DEFAULT '{"for":1,"int":1,"des":1,"car":1,"res":1}',
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    run_migration(conn_save, "ALTER TABLE saves ADD COLUMN base_stats TEXT DEFAULT '{\"for\":1,\"int\":1,\"des\":1,\"car\":1,\"res\":1}'")
    
    # NOVAS COLUNAS PARA O SISTEMA DE DIAS E XP
    run_migration(conn_save, "ALTER TABLE saves ADD COLUMN days_passed INTEGER DEFAULT 1")
    run_migration(conn_save, "ALTER TABLE saves ADD COLUMN stat_exp TEXT DEFAULT '{\"for\":0,\"int\":0,\"des\":0,\"car\":0,\"res\":0}'")
    
    conn_save.commit()
    conn_save.close()

def insert_item(table, data_dict):
    conn = _get_conn(table)
    cursor = conn.cursor()
    columns = ', '.join(data_dict.keys())
    placeholders = ', '.join('?' * len(data_dict))
    cursor.execute(f'INSERT INTO {table} ({columns}) VALUES ({placeholders})', list(data_dict.values()))
    conn.commit()
    conn.close()

def update_item(table, item_id, data_dict):
    conn = _get_conn(table)
    cursor = conn.cursor()
    set_clause = ', '.join([f"{key} = ?" for key in data_dict.keys()])
    values = list(data_dict.values())
    values.append(item_id)
    cursor.execute(f'UPDATE {table} SET {set_clause} WHERE id = ?', values)
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
    except: return[]