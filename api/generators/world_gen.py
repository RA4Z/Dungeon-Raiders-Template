import random
import json
import uuid

# ==========================================
# DICIONÁRIOS DE GERAÇÃO
# ==========================================
FIRST_NAMES_M =[
    "Kael", "Thorin", "Garrick", "Bram", "Darius", "Vane", "Rurik", "Finn", "Alden", "Cormac",
    "Lucian", "Ronan", "Silas", "Eamon", "Gareth", "Kian", "Orson", "Rowan", "Talon", "Zane",
    "Raziel", "Kaelen", "Draven", "Gideon", "Mael", "Nox", "Soren", "Vance", "Alistair", "Bjorn",
    "Aras", "Baelen", "Caius", "Dante", "Elian", "Faust", "Gunnar", "Hakon", "Ivar", "Joram",
    "Kaelric", "Lachlan", "Mordred", "Niall", "Odin", "Phelan", "Quill", "Ramsay", "Stark", "Torin",
    "Ulf", "Valen", "Wolf", "Xander", "Yoric", "Zephyr", "Abaddon", "Barret", "Caspian", "Doran",
    "Elias", "Fenris", "Griffin", "Hadrian", "Ignis", "Jax", "Krix", "Leif", "Magnus", "Nico",
    "Osric", "Pyke", "Quentin", "Ravi", "Sef", "Thane", "Ulric", "Varick", "Wren", "Xerxes",
    "Yosef", "Zadok", "Arlo", "Bane", "Cedric", "Drake", "Egan", "Fletcher", "Gaheris", "Hugo",
    "Ivan", "Jasper", "Kane", "Lucius", "Merrick", "Nash", "Otto", "Percival", "Quin", "Reed",
    "Sampson", "Tristan", "Uziel", "Vigo", "Wyatt", "Xavian", "Yael", "Zale", "Alaric", "Boros",
    "Corin", "Dax", "Erek", "Flynn", "Gaius", "Hollis", "Idris", "Jace", "Kasper", "Lorcan",
    "Malachi", "Nodin", "Oren", "Phineas", "Quinn", "Ryker", "Sayer", "Titus", "Urian", "Vesper",
    "Wulfric", "Xenon", "Yanis", "Zoran", "Amon", "Belial", "Cyren", "Dimitri", "Esker", "Fidius",
    "Grendel", "Hestian", "Irwin", "Jareth", "Kaelum", "Lukan", "Malik", "Norix", "Orion", "Zalthar"
]

FIRST_NAMES_F =[
    "Lyra", "Elowen", "Seris", "Vex", "Thalia", "Aria", "Briar", "Cora", "Dara", "Elara",
    "Fae", "Gael", "Isla", "Juno", "Kira", "Lira", "Maeve", "Nia", "Oria", "Ria",
    "Sylas", "Tia", "Vira", "Zara", "Aeliana", "Caelia", "Elysia", "Ilyana", "Kaela", "Liana",
    "Amara", "Bellona", "Celeste", "Dahlia", "Eris", "Freyja", "Gwen", "Hera", "Iris", "Jade",
    "Kaelith", "Luna", "Mira", "Nyx", "Ophelia", "Petra", "Quilla", "Raven", "Scylla", "Tessa",
    "Ursa", "Vespera", "Willa", "Xenia", "Yara", "Zelda", "Astrid", "Bianca", "Callie", "Dione",
    "Elora", "Flora", "Gaia", "Hazel", "Inara", "Jora", "Kaelen", "Lumi", "Mina", "Nora",
    "Olwen", "Phoebe", "Qi", "Rhea", "Selene", "Thea", "Una", "Valerine", "Wanda", "Xaya",
    "Yvaine", "Ziva", "Aeryn", "Briseis", "Circe", "Drusilla", "Eudora", "Fay", "Gladius", "Hilda",
    "Ione", "Junia", "Kalliope", "Lyre", "Morgana", "Niamh", "Oksana", "Portia", "Qadira", "Rowena",
    "Sif", "Talar", "Ulla", "Vesta", "Wynne", "Xyla", "Yoko", "Zuleika", "Althea", "Beatrix",
    "Ceryn", "Damara", "Elowyn", "Freya", "Gisela", "Hestia", "Idunn", "Jalila", "Karys", "Linnea",
    "Maia", "Neryx", "Ostara", "Phila", "Quinn", "Rhiannon", "Sigrid", "Tyra", "Urania", "Valkyrie",
    "Winona", "Xandri", "Yelena", "Zora", "Anise", "Brea", "Clio", "Dysis", "Eos", "Fiora",
    "Gwyneth", "Helene", "Isolde", "Jilly", "Kora", "Luthien", "Medea", "Neri", "Orenda", "Zalthea"
]

TITLES =[
    "o Destemido", "a Sombra", "Pé-Leve", "o Quebrado", "Olho de Águia", "o Sábio", "Mão de Ferro",
    "o Esquecido", "Sangue Frio", "o Errante", "Lâmina Rápida", "o Justo", "o Louco", "Coração de Leão",
    "o Implacável", "a Fúria", "o Oculto", "o Caçador", "Traz-Tormentas", "o Silencioso", "Sem-Rosto",
    "o Carrasco", "a Sentinela", "Mestre das Chaves", "o Profeta", "Sussurro do Vento", "Punho de Rocha",
    "o Invencível", "a Cicatriz", "Fome de Prata", "o Tecelão", "Mortalha Negra", "o Guardião", "Pele de Urso",
    "o Redimido", "a Víbora", "Cajado Queimado", "o Imortal", "Andarilho do Vazio", "Oceano de Sangue",
    "o Bastardo", "a Herdeira", "Devorador de Almas", "o Exilado", "Olho de Vidro", "Sede de Glória",
    "o Fantasmagórico", "Perna de Pau", "o Abençoado", "Coração de Gelo", "o Piromante", "Língua de Serpente",
    "o Arauto", "a Tempestade", "Sombra do Rei", "o Desonrado", "Punhal de Vidro", "o Mensageiro",
    "a Lenda", "o Caótico", "Senhor das Sombras", "o Renegado", "Escudo de Carvalho", "o Alquimista",
    "o Necromante", "a Estrela Caída", "Caçador de Gigantes", "o Errático", "Mão Direita", "o Vidente",
    "a Espada Sagrada", "o Herege", "Voz dos Mortos", "o Magnânimo", "Grito do Abismo", "o Silenciador",
    "o Atormentado", "a Pureza", "Sopro de Fogo", "o Inquisidor", "Pele de Bronze", "o Diplomata",
    "a Navalha", "o Imóvel", "Mestre das Bestas", "o Mercador de Almas", "a Sacerdotisa", "o Caçador de Recompensas",
    "o Flagelo", "a Resiliência", "o Desbravador", "Punho de Ouro", "o Arqueiro Negro", "a Voz da Razão",
    "o Obsidiana", "o Radical", "Sede de Sangue", "o Maldição", "a Relíquia", "o Escravo do Destino",
    "o Soberano", "a Calamidade", "o Martelo do Norte", "o Sol de Inverno", "a Maré Escura"
]

GUILD_ADJECTIVES =[
    "Ordem", "Irmandade", "Pacto", "Clã", "Legião", "Círculo", "Sindicato", "Guilda", "Companhia",
    "Aliança", "Conselho", "Corte", "Exército", "Secta", "Bastião", "Esquadrão", "Enclave", "Comuna",
    "Tribunal", "Domínio", "Horda", "Santuário", "Templo", "Frente", "Liga", "Cartel", "União",
    "Sociedade", "Igreja", "Oráculo", "Santuário", "Refúgio", "Arca", "Cripta", "Abismo", "Vanguarda",
    "Falange", "Brigada", "Conclave", "Assembleia", "Dinastia", "Kahal", "Cabal", "Fundação", "Instituto"
]

GUILD_NOUNS =[
    "do Aço", "das Sombras", "do Corvo", "da Chama", "do Lobo", "de Sangue", "do Alvorecer", "da Noite", "da Prata", "do Dragão", "do Urso", "da Caveira",
    "do Abismo", "do Vazio", "da Tempestade", "da Montanha", "do Carvalho", "da Fênix", "da Névoa", "do Trovão", "da Rosa", "do Trono", "do Punho", "do Cálice",
    "do Destino", "da Ruína", "da Glória", "da Estrela", "da Lua", "do Sol", "da Vingança", "da Justiça", "da Honra", "da Traição", "do Labirinto", "do Cristal",
    "do Martelo", "da Flecha", "do Escudo", "da Coroa", "do Cetro", "da Adaga", "do Relâmpago", "da Cinza", "da Serpente", "do Falcão", "da Aranha", "do Escorpião",
    "do Leão", "do Tigre", "da Hydra", "do Kraken", "do Grifo", "do Unicórnio", "do Gelo", "da Obsidiana", "do Éter", "da Eternidade", "do Infinito", "da Aurora"
]

COLORS =[
    '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d', # Originais
    '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#d35400', '#16a085', '#2c3e50', '#95a5a6', # Versões Escuras
    '#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fab1a0', '#81ecec', '#636e72', '#b2bec3', # Tons Pastel
    '#d63031', '#0984e3', '#00b894', '#fdcb6e', '#6c5ce7', '#e17055', '#00cec9', '#2d3436', '#dfe6e9', # Vibrantes
    '#1e272e', '#485460', '#ffa801', '#ffd32a', '#ff5e57', '#ff3f34', '#05c46b', '#0be881', '#575fcf'  # Modernos/Neon
]
ICONS =[
    '⚔️', '🛡️', '🐺', '🦅', '🔥', '💧', '⚡', '🌙', '☀️', '💀', '🐉', '🌲', # Originais
    '🏹', '🗡️', '⚒️', '⛏️', '📜', '📖', '🧪', '💎', '💰', '🗝️', '🎭', '🔮', # Itens/Magia
    '🦁', '🐍', '🐘', '🕷️', '🦂', '🦉', '🦋', '🐎', '🐂', '🦈', '🐗', '🦇', # Animais
    '🏔️', '🌋', '🌊', '🌪️', '🍄', '🍀', '🌵', '🌸', '🎋', '🍂', '🌍', '☄️', # Natureza
    '🏰', '🏛️', '⛪', '⛩️', '⚓', '⚖️', '⛓️', '⚰️', '🕯️', '🔔', '🚩', '🏆'  # Social/Estruturas
]

SKIN_COLORS =['#ffffff', '#ffdfc4', '#d4a373', '#8d5524', '#4b3621']

# ==========================================
# LÓGICA DO GERADOR
# ==========================================
class WorldGenerator:
    def __init__(self, game_data):
        self.game_data = game_data
        self.bodies = [b for b in game_data.get('bodies', []) if int(b.get('is_playable', 0)) == 1]
        self.equipments = game_data.get('equipments',[])
        self.attacks = game_data.get('attacks',[])
        self.monsters = [c for c in game_data.get('characters', []) if str(c.get('race', '')).lower() != 'humano']
        self.db_humans =[c for c in game_data.get('characters', []) if str(c.get('race', '')).lower() == 'humano']

    def generate_world(self, num_guilds, num_npcs):
        # 1. Puxa as Guildas Manuais do DB
        guilds = list(self.game_data.get('guilds',[]))
        # Converte IDs manuais para string para padronizar
        for g in guilds: g['id'] = str(g['id'])
        
        members = []
        quests =[]
        
        # 2. Gera Guildas Aleatórias
        for _ in range(num_guilds):
            guilds.append(self._generate_guild())
            
        # 3. Importa Membros Manuais (Criados na aba Membros da Forja)
        db_members = self.game_data.get('guild_members',[])
        for db_m in db_members:
            char = next((c for c in self.db_humans if c['id'] == db_m['character_id']), None)
            if char:
                members.append(self._convert_db_human(char, str(db_m['guild_id']), db_m['hire_cost'], db_m['daily_wage']))

        # 4. Importa os outros Humanos do Banco de Dados (Andarilhos ou membros aleatórios)
        used_char_ids =[m.get('character_id') for m in db_members]
        for db_char in self.db_humans:
            if db_char['id'] not in used_char_ids:
                if random.random() > 0.3: # 70% chance de aparecer no mundo
                    # 50% de chance de entrar em uma guilda aleatória, 50% de ser sem guilda
                    random_guild = random.choice(guilds)['id'] if random.random() > 0.5 else ""
                    members.append(self._convert_db_human(db_char, random_guild))

        # 5. Gera NPCs Procedurais para encher o mundo
        for _ in range(num_npcs):
            members.append(self._generate_npc(guilds))
                
        # 6. Puxa Quests Manuais e gera Quests Aleatórias
        quests = list(self.game_data.get('guild_quests',[]))
        for q in quests: q['id'] = str(q['id']); q['guild_id'] = str(q['guild_id'])
        
        for guild in guilds:
            for _ in range(random.randint(2, 5)):
                if self.monsters:
                    quests.append(self._generate_quest(guild['id']))
                
        return guilds, members, quests

    # ═══════════════════════════════════════════════════════════
    # GERAÇÃO ISOLADA DE QUESTS (usado pelo ciclo de 30 dias)
    # ═══════════════════════════════════════════════════════════
    def generate_quests_for_guilds(self, guilds):
        """
        Gera uma nova leva de quests para as guildas fornecidas sem recriar
        membros ou o mundo inteiro. Ideal para o ciclo de renovação de 30 dias.

        Args:
            guilds: lista de dicts de guilda (já existentes no save do jogador).

        Returns:
            list[dict]: lista de novas quests prontas para serem inseridas em world_quests.
        """
        if not self.monsters:
            return[]

        new_quests =[]
        for guild in guilds:
            guild_id = str(guild.get('id', ''))
            if not guild_id:
                continue
            num_new = random.randint(2, 5)
            for _ in range(num_new):
                new_quests.append(self._generate_quest(guild_id))

        return new_quests

    def _generate_guild(self):
        return {
            "id": str(uuid.uuid4()),
            "name": f"{random.choice(GUILD_ADJECTIVES)} {random.choice(GUILD_NOUNS)}",
            "description": "Uma organização independente operando na região.",
            "emblem_color": random.choice(COLORS),
            "emblem_icon": random.choice(ICONS),
            "rank_name_1": "Iniciante", "rank_name_2": "Veterano", 
            "rank_name_3": "Elite", "rank_name_4": "Mestre", "rank_name_5": "Lendário"
        }

    def _convert_db_human(self, db_char, guild_id, hire_cost=None, daily_wage=None):
        try: base_stats = json.loads(db_char.get('base_stats', '{}'))
        except: base_stats = {"for":1,"int":1,"des":1,"car":1,"res":1}
        
        power = sum(int(v) for v in base_stats.values())
        
        calc_hire_cost = power * 75
        calc_wage = int(calc_hire_cost * 0.1)

        try:
            attacks = json.loads(db_char.get('attacks', '[1]'))
        except:
            attacks = [1]
            
        power_tier = 1
        if power > 50: power_tier = 2
        if power > 150: power_tier = 3
        if power > 400: power_tier = 4
        if power > 800: power_tier = 5
        
        attack_exp = {}
        for atk_id in set(attacks):
            atk_lvl = max(1, int(power_tier * random.uniform(0.8, 2.5)))
            attack_exp[str(atk_id)] = {"xp": 0, "level": atk_lvl}

        return {
            "id": str(uuid.uuid4()),
            "guild_id": guild_id,
            "name": db_char['name'],
            "race": "humano",
            "gender": "male",
            "equipment_data": db_char.get('equipment_data', '{}'),
            "base_stats": json.dumps(base_stats),
            "attacks": json.dumps(attacks),
            "attack_exp": json.dumps(attack_exp),
            "hire_cost": hire_cost if hire_cost is not None else calc_hire_cost,
            "daily_wage": daily_wage if daily_wage is not None else calc_wage,
            "power_score": power,
            "gold": random.randint(10, 200),
            "is_precreated": True
        }

    def _generate_npc(self, guilds):
        if not self.bodies: return None
        gender = random.choice(['male', 'female'])
        name = random.choice(FIRST_NAMES_M if gender == 'male' else FIRST_NAMES_F)
        if random.random() > 0.4: name += f" {random.choice(TITLES)}"
            
        # ── REBALANCEAMENTO DE PODER ──
        # Reduzimos o teto máximo e ajustamos as probabilidades de raridade
        target_power = random.choices([
                random.randint(10, 50),     # Novato (45% do mundo)
                random.randint(51, 150),    # Intermediario (30%)
                random.randint(151, 400),   # Avançado (15%)
                random.randint(401, 600),   # Lendário (8%)
                random.randint(601, 800)   # Heróis Supremos (Teto máximo - 2%)
            ],
            weights=[50, 30, 15, 4.5, 0.5] 
        )[0]
        
        # Distribuição mais suave de atributos (evita um único atributo sugar todo o poder)
        weights =[random.uniform(0.4, 1.0) for _ in range(5)]
        weights[random.randint(0,4)] += 1.2 # Bônus para um atributo "principal"
        total_w = sum(weights)
        
        base_stats = {}
        keys = ['for','int','des','car','res']
        allocated = 0
        for i in range(4):
            val = max(1, int((weights[i]/total_w) * target_power))
            base_stats[keys[i]] = val
            allocated += val
        base_stats[keys[4]] = max(1, target_power - allocated)
        
        power = sum(base_stats.values())
        
        # Tiers atualizados baseados no novo limite
        power_tier = 1
        if power > 50: power_tier = 2
        if power > 150: power_tier = 3
        if power > 400: power_tier = 4
        if power > 700: power_tier = 5

        eq_data = {"base": random.choice(self.bodies)['id'], "skin_color": random.choice(SKIN_COLORS)}
        for slot in['face', 'hair', 'shirt', 'pants', 'boots', 'gloves', 'hand_r']:
            if random.random() > 0.3:
                valid_eqs = [e for e in self.equipments if e['type'] == slot and e['gender'] in ['both', gender]]
                if valid_eqs: eq_data[slot] = random.choice(valid_eqs)['id']

        npc_attacks = [1]
        if self.attacks:
            num_extra_attacks = min(len(self.attacks), power_tier + random.randint(0, 2))
            extra_atks = random.sample(self.attacks, k=num_extra_attacks)
            npc_attacks.extend([a['id'] for a in extra_atks if a['id'] != 1])

        # Inicializa XP de ataques com níveis um pouco menos apelativos
        attack_exp = {}
        for atk_id in set(npc_attacks):
            atk_lvl = max(1, int(power_tier * random.uniform(0.8, 2.0)))
            attack_exp[str(atk_id)] = {"xp": 0, "level": atk_lvl}
            
        assigned_guild = random.choice(guilds)['id'] if random.random() > 0.5 else ""

        return {
            "id": str(uuid.uuid4()),
            "guild_id": assigned_guild,
            "name": name,
            "race": "humano",
            "gender": gender,
            "equipment_data": json.dumps(eq_data),
            "base_stats": json.dumps(base_stats),
            "attacks": json.dumps(list(set(npc_attacks))),
            "attack_exp": json.dumps(attack_exp),
            "hire_cost": power * 75,
            "daily_wage": int((power * 75) * 0.1),
            "power_score": power,
            "gold": random.randint(0, 50) * power_tier,
            "is_precreated": False
        }

    def _generate_quest(self, guild_id):
        target = random.choice(self.monsters)
        diff = random.randint(1, 5)
        return {
            "id": str(uuid.uuid4()), "guild_id": guild_id, "name": f"Eliminar {target['name']}",
            "description": f"Derrote a ameaça na caverna.", "difficulty": diff,
            "gold_reward": (random.randint(3, 10) * 5) * diff, "rep_reward": diff * 10,
            "required_kills": random.randint(2, 8) * diff, "target_character_id": target['id'],
            "time_limit_days": random.choice([0, 7, 14])
        }
    