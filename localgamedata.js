gameData = {
    "maps": {
        "a-box": {
            "-": "",
            "enemies": "",
            "ports": {
                "box-shore": 100
            },
            "npc": "",
            "edibles": "",
            "layers": [
                "front"
            ]
        },
        "box-shore": {
            "-": "",
            "enemies": {
                "burning-plank": 1
            },
            "ports": {
                "a-box": 7,
                "box-shore": 95
            },
            "npc": "",
            "edibles": "",
            "layers": [
                "back",
                "front"
            ]
        },
        "rookie-camp": {
            "-": "",
            "enemies": {
                "wood-box": 1
            },
            "ports": {
                "greenville": 100
            },
            "npc": "",
            "edibles": "",
            "layers": [
                "back"
            ]
        },
        "greenville": {
            "-": "",
            "enemies": "",
            "ports": {
                "rookie-camp": 0,
                "threes": 49
            },
            "npc": {
                "george": 20,
                "woody": 33,
                "stork": 69
            },
            "edibles": "",
            "layers": [
                "back"
            ]
        },
        "threes": {
            "-": "",
            "enemies": {
                "pigeon": 3,
                "oakblock": 6,
                "worm": 2
            },
            "ports": {
                "greenville": 0,
                "mother-three": 50
            },
            "npc": "",
            "edibles": {
                "health": "three-fruit",
                "mana": "magic-water"
            },
            "layers": [
                "back"
            ]
        },
        "mother-three": {
            "-": "",
            "enemies": "",
            "ports": {
                "threes": 10
            },
            "npc": {
                "three-spirit": 55
            },
            "edibles": "",
            "layers": [
                "back"
            ]
        }
    },
    "enemies": {
        "worm": {
            "-": "",
            "hp": "8",
            "attack": "1",
            "speed": "20",
            "item": "worm-jelly",
            "gold": "TRUE",
            "hitable": "TRUE",
            "sound": "squeak-1",
            "size": [
                44,
                28
            ]
        },
        "oakblock": {
            "-": "",
            "hp": "6",
            "attack": "1",
            "speed": "100",
            "item": "wood",
            "gold": "FALSE",
            "hitable": "TRUE",
            "sound": "crack",
            "size": [
                47,
                46
            ]
        },
        "pigeon": {
            "-": "",
            "hp": "10",
            "attack": "1",
            "speed": "25",
            "item": "pigeon-feather",
            "gold": "TRUE",
            "hitable": "TRUE",
            "sound": "bird",
            "size": [
                60,
                54
            ]
        },
        "wood-box": {
            "-": "",
            "hp": "10",
            "attack": "0",
            "speed": "0",
            "item": "broken-plank",
            "gold": "FALSE",
            "hitable": "TRUE",
            "sound": "crack",
            "size": [
                40,
                40
            ]
        },
        "burning-plank": {
            "-": "",
            "hp": "10",
            "attack": "1",
            "speed": "0",
            "item": "broken-plank",
            "gold": "FALSE",
            "hitable": "FALSE",
            "sound": "crack",
            "size": [
                30,
                40
            ]
        }
    },
    "npcs": {
        "three-spirit": {
            "Column 1": "",
            "title": "spirit",
            "type": "quest",
            "speech": "Bless you pigeon slayer",
            "questID": "4279388",
            "items": "",
            "size": "120"
        },
        "woody": {
            "Column 1": "",
            "title": "carpenter",
            "type": "shop",
            "speech": "Welcome to Greenville! Interested in some gear? My items are made of 100% Valyrian wood, freshly cut from the nearby Threes.",
            "questID": "",
            "items": [
                "wood-bat",
                "wood-sword",
                "wood-shield",
                "wood-bow"
            ],
            "size": "80"
        },
        "stork": {
            "Column 1": "",
            "title": "trader",
            "type": "sell",
            "speech": "Sell everything you don't need to me!",
            "questID": "",
            "items": "",
            "size": "80"
        },
        "george": {
            "Column 1": "",
            "title": "commander",
            "type": "quest",
            "speech": "Good morning, recruit! It's time to start your adventure.",
            "questID": "4279387",
            "items": "",
            "size": "80"
        }
    },
    "equipments": {
        "wood-bow": {
            "-": "",
            "category": "weapon",
            "type": "range",
            "attack": "2",
            "defense": "0",
            "price": {
                "gold": 100,
                "wood": 30
            },
            "description": ""
        },
        "wood-sword": {
            "-": "",
            "category": "weapon",
            "type": "melee",
            "attack": "3",
            "defense": "0",
            "price": {
                "gold": 20,
                "wood": 20
            },
            "description": ""
        },
        "wood-bat": {
            "-": "",
            "category": "weapon",
            "type": "melee",
            "attack": "2",
            "defense": "0",
            "price": {
                "gold": 5,
                "wood": 10
            },
            "description": ""
        },
        "wood-shield": {
            "-": "",
            "category": "shield",
            "type": "",
            "attack": "0",
            "defense": "1",
            "price": {
                "gold": 40,
                "wood": 30
            },
            "description": ""
        },
        "red-bandana": {
            "-": "",
            "category": "hat",
            "type": "",
            "attack": "0",
            "defense": "1",
            "price": {
                "gold": 50
            },
            "description": ""
        },
        "none": {
            "-": "",
            "category": "weapon",
            "type": "melee",
            "attack": "1",
            "defense": "0",
            "price": "",
            "description": ""
        }
    },
    "skills": {
        "surge": {
            "-": "",
            "atkMultiplier": "2"
        },
        "impact": {
            "-": "",
            "atkMultiplier": "1"
        }
    },
    "quests": {
        "4279388": {
            "-": "",
            "task": "Collect 5 pigeon feathers",
            "type": "collect",
            "requirement": "pigeon-feather",
            "amount": "5",
            "reward": {
                "wood": 10,
                "gold": 5
            }
        },
        "4279387": {
            "-": "",
            "task": "Slain 50 enemies",
            "type": "achieve",
            "requirement": "totalEnemiesSlained",
            "amount": "50",
            "reward": {
                "red-bandana": 1,
                "gold": 10
            }
        }
    }
}