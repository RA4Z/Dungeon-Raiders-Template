import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'game_data.db')

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Tabela de Cenários
    cursor.execute('''CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image_path TEXT, description TEXT
    )''')
    
    # Tabela de Corpos Base (Manequins)
    cursor.execute('''CREATE TABLE IF NOT EXISTS bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, img_front TEXT, img_back TEXT
    )''')

    # Tabela de Equipamentos e Peças (Rosto, Cabelo, Roupas) com Status
    cursor.execute('''CREATE TABLE IF NOT EXISTS equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        img_front TEXT,
        img_back TEXT,
        def_phys INTEGER,
        def_mag INTEGER,
        bonus_str INTEGER,
        bonus_int INTEGER,
        bonus_dex INTEGER
    )''')
    
    # Tabela de Personagens (Guarda as IDs dos equipamentos equipados como JSON)
    cursor.execute('''CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        hp INTEGER,
        attack INTEGER,
        race TEXT,
        img_front TEXT,
        img_back TEXT,
        equipment_data TEXT
    )''')

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
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM {table}')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]