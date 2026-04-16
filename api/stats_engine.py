# api/stats_engine.py

class StatsEngine:
    BASE_STATS = ['for', 'int', 'des', 'car', 'res']
    
    @staticmethod
    def calculate_derived(base_stats, bonus_stats=None, overrides=None):
        """
        base_stats: dict com 'for', 'int', 'des', 'car', 'res'
        bonus_stats: dict com bônus de equipamentos
        overrides: dict com status forçados (usado para monstros)
        """
        # Garante que todos os base_stats tenham pelo menos 1
        s = {k: int(base_stats.get(k, 1)) for k in StatsEngine.BASE_STATS}
        
        # Bônus Base dos Equipamentos (Ex: Espada que dá +5 de Força)
        if bonus_stats:
            for k in StatsEngine.BASE_STATS:
                s[k] += int(bonus_stats.get(k, 0))

        # FÓRMULAS DE RPG (Flexíveis e editáveis)
        computed = {
            'hp': 50 + (s['res'] * 10) + (s['for'] * 2),
            'mana': 10 + (s['int'] * 10) + (s['car'] * 2),
            'stamina': 20 + (s['des'] * 5) + (s['res'] * 5),
            
            'phys_dmg': (s['for'] * 2) + (s['des'] * 0.5),
            'mag_dmg': (s['int'] * 2.5) + (s['car'] * 0.5),
            
            'phys_res': (s['res'] * 1.5) + (s['for'] * 0.5),
            'mag_res': (s['res'] * 1.0) + (s['int'] * 1.0),
            
            'crit_rate': 5.0 + (s['des'] * 0.5), # em %
            'crit_dmg': 150.0 + (s['for'] * 1.0) # em %
        }

        # Bônus de Substatus Direto de Equipamentos (Ex: Anel de +10% de Crit)
        if bonus_stats:
            for k in computed.keys():
                computed[k] += float(bonus_stats.get(k, 0))

        # Overrides (Monstros podem ignorar a fórmula e ter 5000 de HP direto)
        if overrides:
            for k, v in overrides.items():
                if v is not None and str(v).strip() != "":
                    computed[k] = float(v)

        return s, computed