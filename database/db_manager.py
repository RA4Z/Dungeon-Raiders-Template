# database/db_manager.py
import sqlite3
import sys
import os

def resource_path(relative_path):
    """ Retorna o caminho absoluto para o recurso, funciona em dev e no PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

GAME_DB_PATH = resource_path('game_data.db')
SAVE_DB_PATH = os.path.join(os.path.abspath(os.getcwd()), 'saves.db')

def get_game_connection():
    os.makedirs(os.path.dirname(GAME_DB_PATH), exist_ok=True)
    return sqlite3.connect(GAME_DB_PATH)

def get_save_connection():
    os.makedirs(os.path.dirname(SAVE_DB_PATH), exist_ok=True)
    return sqlite3.connect(SAVE_DB_PATH)

def _get_conn(table):
    if table in ('saves', 'save_party', 'tournament_history'): return get_save_connection()
    return get_game_connection()

def run_migration(conn, sql):
    try: conn.cursor().execute(sql)
    except sqlite3.OperationalError: pass

def init_db():
    # ── GAME DB ──────────────────────────────────────────────
    conn = get_game_connection()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image_path TEXT, description TEXT)''')

    c.execute('''CREATE TABLE IF NOT EXISTS bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,
        img_front TEXT, img_back TEXT,
        img_front_f TEXT DEFAULT '', img_back_f TEXT DEFAULT '',
        is_playable INTEGER DEFAULT 0)''')
    run_migration(conn, "ALTER TABLE bodies ADD COLUMN is_playable INTEGER DEFAULT 0")
    run_migration(conn, "ALTER TABLE bodies ADD COLUMN img_front_f TEXT DEFAULT ''")
    run_migration(conn, "ALTER TABLE bodies ADD COLUMN img_back_f TEXT DEFAULT ''")

    # ── SETS DE EQUIPAMENTOS ──────────────────────────────
    c.execute('''CREATE TABLE IF NOT EXISTS equipment_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        bonus_2 TEXT DEFAULT '{}',
        bonus_3 TEXT DEFAULT '{}',
        bonus_4 TEXT DEFAULT '{}',
        bonus_5 TEXT DEFAULT '{}',
        bonus_6 TEXT DEFAULT '{}')''')

    c.execute('''CREATE TABLE IF NOT EXISTS equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT,
        img_front TEXT, img_back TEXT,
        img_front_f TEXT DEFAULT '', img_back_f TEXT DEFAULT '',
        gender TEXT DEFAULT 'both',
        drop_chance INTEGER DEFAULT 10,
        stats_modifiers TEXT DEFAULT '{}',
        set_id INTEGER DEFAULT 0)''')
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN stats_modifiers TEXT DEFAULT '{}'")
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN img_front_f TEXT DEFAULT ''")
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN img_back_f TEXT DEFAULT ''")
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN gender TEXT DEFAULT 'both'")
    run_migration(conn, "ALTER TABLE equipments ADD COLUMN set_id INTEGER DEFAULT 0")

    c.execute('''CREATE TABLE IF NOT EXISTS consumables (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, effect_type TEXT,
        effect_value INTEGER, img_path TEXT, drop_chance INTEGER DEFAULT 20)''')

    c.execute('''CREATE TABLE IF NOT EXISTS attacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, atk_type TEXT,
        base_power REAL DEFAULT 0, hp_cost INTEGER DEFAULT 0,
        mana_cost INTEGER DEFAULT 0, stamina_cost INTEGER DEFAULT 0,
        description TEXT DEFAULT '', scaling TEXT DEFAULT '{}')''')
    run_migration(conn, "ALTER TABLE attacks ADD COLUMN hp_cost INTEGER DEFAULT 0")
    run_migration(conn, "ALTER TABLE attacks ADD COLUMN mana_cost INTEGER DEFAULT 0")
    run_migration(conn, "ALTER TABLE attacks ADD COLUMN stamina_cost INTEGER DEFAULT 0")
    run_migration(conn, "ALTER TABLE attacks ADD COLUMN description TEXT DEFAULT ''")

    c.execute("SELECT COUNT(*) FROM attacks")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO attacks (name,atk_type,base_power,stamina_cost,description,scaling) VALUES ('Soco Simples','phys',5,5,'Um ataque físico básico.','{\"for\":1.0}')")
        c.execute("INSERT INTO attacks (name,atk_type,base_power,mana_cost,description,scaling) VALUES ('Míssil Mágico','mag',8,8,'Um projétil arcano.','{\"int\":1.2}')")

    c.execute('''CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, race TEXT,
        img_front TEXT, img_back TEXT, equipment_data TEXT,
        custom_drops TEXT DEFAULT '[]', base_stats TEXT DEFAULT '{}',
        custom_substats TEXT DEFAULT '{}', attacks TEXT DEFAULT '[1]',
        power_score INTEGER DEFAULT 0)''')
    run_migration(conn, "ALTER TABLE characters ADD COLUMN custom_drops TEXT DEFAULT '[]'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN base_stats TEXT DEFAULT '{}'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN custom_substats TEXT DEFAULT '{}'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN attacks TEXT DEFAULT '[1]'")
    run_migration(conn, "ALTER TABLE characters ADD COLUMN power_score INTEGER DEFAULT 0")

    # ── GUILDAS ──────────────────────────────────────────────
    c.execute('''CREATE TABLE IF NOT EXISTS guilds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        emblem_color TEXT DEFAULT '#e74c3c',
        emblem_icon TEXT DEFAULT '⚔️',
        rank_name_1 TEXT DEFAULT 'Recruta',
        rank_name_2 TEXT DEFAULT 'Veterano',
        rank_name_3 TEXT DEFAULT 'Elite',
        rank_name_4 TEXT DEFAULT 'Campeão',
        rank_name_5 TEXT DEFAULT 'Lendário')''')

    c.execute('''CREATE TABLE IF NOT EXISTS guild_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        difficulty INTEGER DEFAULT 1,
        gold_reward INTEGER DEFAULT 50,
        rep_reward INTEGER DEFAULT 10,
        required_kills INTEGER DEFAULT 0,
        target_character_id INTEGER DEFAULT 0,
        time_limit_days INTEGER DEFAULT 0)''')

    c.execute('''CREATE TABLE IF NOT EXISTS guild_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        hire_cost INTEGER DEFAULT 100,
        daily_wage INTEGER DEFAULT 10)''')

    conn.commit()
    conn.close()

    # ── SAVE DB ───────────────────────────────────────────────
    conn_save = get_save_connection()
    c_save = conn_save.cursor()
    c_save.execute('''CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, body_id INTEGER, gold INTEGER DEFAULT 0,
        current_hp INTEGER DEFAULT 100, current_mana INTEGER DEFAULT 9999, current_stamina INTEGER DEFAULT 9999,
        equipment_data TEXT DEFAULT '{}', inventory_data TEXT DEFAULT '{"equipments":[],"consumables":{}}',
        base_stats TEXT DEFAULT '{"for":1,"int":1,"des":1,"car":1,"res":1}',
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP, days_passed INTEGER DEFAULT 1,
        stat_exp TEXT DEFAULT '{"for":0,"int":0,"des":0,"car":0,"res":0}', attacks TEXT DEFAULT '[1]',
        hotbar_data TEXT DEFAULT '[1,null,null,null,null,null,null,null,null,null]',
        attack_exp TEXT DEFAULT '{"1":{"xp":0,"level":1}}', party_data TEXT DEFAULT '[]',
        hired_allies TEXT DEFAULT '[]', guild_reputation TEXT DEFAULT '{}',
        active_quests TEXT DEFAULT '[]', completed_quests TEXT DEFAULT '[]',
        dungeon_max_floor INTEGER DEFAULT 1, dungeon_current_floor INTEGER DEFAULT 1,
        power_score INTEGER DEFAULT 0, fired_zero_moral TEXT DEFAULT '[]', gender TEXT DEFAULT 'male',
        world_guilds TEXT DEFAULT '[]', world_members TEXT DEFAULT '[]', world_quests TEXT DEFAULT '[]',
        calendar_day INTEGER DEFAULT 1,
        calendar_month INTEGER DEFAULT 1,
        calendar_year INTEGER DEFAULT 1,
        last_tournament_day INTEGER DEFAULT 0,
        tournament_history TEXT DEFAULT '[]',
        shop_last_day  INTEGER DEFAULT 0,
        shop_inventory TEXT    DEFAULT '[]'
    )''')

    migrations = [
        "ALTER TABLE saves ADD COLUMN base_stats TEXT DEFAULT '{\"for\":1,\"int\":1,\"des\":1,\"car\":1,\"res\":1}'",
        "ALTER TABLE saves ADD COLUMN days_passed INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN stat_exp TEXT DEFAULT '{\"for\":0,\"int\":0,\"des\":0,\"car\":0,\"res\":0}'",
        "ALTER TABLE saves ADD COLUMN attacks TEXT DEFAULT '[1]'",
        "ALTER TABLE saves ADD COLUMN hotbar_data TEXT DEFAULT '[1,null,null,null,null,null,null,null,null,null]'",
        "ALTER TABLE saves ADD COLUMN attack_exp TEXT DEFAULT '{\"1\":{\"xp\":0,\"level\":1}}'",
        "ALTER TABLE saves ADD COLUMN current_mana INTEGER DEFAULT 9999",
        "ALTER TABLE saves ADD COLUMN current_stamina INTEGER DEFAULT 9999",
        "ALTER TABLE saves ADD COLUMN party_data TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN hired_allies TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN guild_reputation TEXT DEFAULT '{}'",
        "ALTER TABLE saves ADD COLUMN active_quests TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN completed_quests TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN dungeon_max_floor INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN dungeon_current_floor INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN power_score INTEGER DEFAULT 0",
        "ALTER TABLE saves ADD COLUMN fired_zero_moral TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN gender TEXT DEFAULT 'male'",
        "ALTER TABLE saves ADD COLUMN world_guilds TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN world_members TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN world_quests TEXT DEFAULT '[]'",
        # ── NOVAS COLUNAS: CALENDÁRIO E TORNEIO ──────────────
        "ALTER TABLE saves ADD COLUMN calendar_day INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN calendar_month INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN calendar_year INTEGER DEFAULT 1",
        "ALTER TABLE saves ADD COLUMN last_tournament_day INTEGER DEFAULT 0",
        "ALTER TABLE saves ADD COLUMN tournament_history TEXT DEFAULT '[]'",
        "ALTER TABLE saves ADD COLUMN shop_last_day  INTEGER DEFAULT 0",
        "ALTER TABLE saves ADD COLUMN shop_inventory TEXT    DEFAULT '[]'",
    ]
    for sql in migrations:
        run_migration(conn_save, sql)

    # ── TABELA DE HISTÓRICO DE TORNEIOS ──────────────────────
    # Registra cada vitória de torneio individualmente para o Hall da Fama
    c_save.execute('''CREATE TABLE IF NOT EXISTS tournament_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        winner_name TEXT NOT NULL,
        winner_id TEXT DEFAULT '',
        is_player INTEGER DEFAULT 0,
        category TEXT NOT NULL,
        day INTEGER DEFAULT 1,
        month INTEGER DEFAULT 1,
        year INTEGER DEFAULT 1,
        prize_gold INTEGER DEFAULT 0
    )''')

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
        return [dict(row) for row in rows]
    except: return []

def get_tournament_hall_of_fame(save_id):
    """Retorna Top 10 vencedores por categoria direto do banco de dados."""
    try:
        conn = get_save_connection()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        results = {}
        categories = ['novato', 'intermediario', 'avancado', 'lendario']
        for cat in categories:
            c.execute('''
                SELECT winner_name, winner_id, is_player,
                       COUNT(*) as wins,
                       SUM(prize_gold) as total_gold
                FROM tournament_history
                WHERE save_id = ? AND category = ?
                GROUP BY winner_name, winner_id
                ORDER BY wins DESC
                LIMIT 10
            ''', (save_id, cat))
            results[cat] = [dict(row) for row in c.fetchall()]
        conn.close()
        return results
    except:
        return {}

def insert_tournament_result(save_id, winner_name, winner_id, is_player, category, day, month, year, prize_gold):
    """Registra um resultado de torneio no banco de dados."""
    try:
        conn = get_save_connection()
        c = conn.cursor()
        c.execute('''INSERT INTO tournament_history
            (save_id, winner_name, winner_id, is_player, category, day, month, year, prize_gold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (save_id, winner_name, str(winner_id), 1 if is_player else 0,
             category, day, month, year, prize_gold))
        conn.commit()
        conn.close()
        return True
    except:
        return False
