import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'game_data.db')

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image_path TEXT, description TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, img_front TEXT, img_back TEXT
    )''')

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
    
    # Atualizamos a criação base para ter a coluna custom_drops
    cursor.execute('''CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, hp INTEGER, attack INTEGER, race TEXT,
        img_front TEXT, img_back TEXT, equipment_data TEXT,
        custom_drops TEXT DEFAULT '[]'
    )''')

    # TENTA ADICIONAR A COLUNA CASO O BANCO JÁ EXISTA ANTIGAMENTE (MIGRAÇÃO SEGURA)
    try:
        cursor.execute("ALTER TABLE characters ADD COLUMN custom_drops TEXT DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass # A coluna já existe, segue o jogo.

    cursor.execute('''CREATE TABLE IF NOT EXISTS player_save (
        id INTEGER PRIMARY KEY DEFAULT 1,
        gold INTEGER DEFAULT 0,
        active_character_id INTEGER,
        current_hp INTEGER DEFAULT 100,
        inventory_data TEXT DEFAULT '{"equipments":[], "consumables": {}}',
        FOREIGN KEY(active_character_id) REFERENCES characters(id)
    )''')

    cursor.execute('SELECT COUNT(*) FROM player_save WHERE id = 1')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO player_save (id, gold, current_hp, inventory_data) VALUES (1, 0, 100, \'{"equipments":[], "consumables": {}}\')')

    conn.commit()
    conn.close()

def insert_item(table, data_dict):
    conn = get_connection()
    cursor = conn.cursor()
    columns = ', '.join(data_dict.keys())
    placeholders = ', '.join('?' * len(data_dict))
    sql = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'
    cursor.execute(sql, list(data_dict.values()))
    conn.commit()
    conn.close()

def update_item(table, item_id, data_dict):
    conn = get_connection()
    cursor = conn.cursor()
    set_clause = ', '.join([f"{key} = ?" for key in data_dict.keys()])
    sql = f'UPDATE {table} SET {set_clause} WHERE id = ?'
    values = list(data_dict.values())
    values.append(item_id)
    cursor.execute(sql, values)
    conn.commit()
    conn.close()

def delete_item(table, item_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f'DELETE FROM {table} WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()

def get_all_items(table):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f'SELECT * FROM {table}')
        rows = cursor.fetchall()
        conn.close()
        return[dict(row) for row in rows]
    except:
        return[]