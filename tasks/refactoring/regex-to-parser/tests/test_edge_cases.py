from src.config_parser import parse_config


def test_empty_file():
    assert parse_config("") == {}


def test_only_comments():
    config = '''
# just comments
# nothing else
'''
    assert parse_config(config) == {}


def test_unicode_values():
    config = '''
i18n {
    greeting = "Hola mundo"
    farewell = "Auf Wiedersehen"
}
'''
    result = parse_config(config)
    assert result["i18n"]["greeting"] == "Hola mundo"
    assert result["i18n"]["farewell"] == "Auf Wiedersehen"


def test_whitespace_variations():
    config = '''
db{
host="localhost"
    port   =   5432
}
'''
    result = parse_config(config)
    assert result["db"]["host"] == "localhost"
    assert result["db"]["port"] == 5432


def test_empty_block():
    config = '''
empty {
}
'''
    result = parse_config(config)
    assert result["empty"] == {}


def test_empty_array():
    config = '''
server {
    tags = []
}
'''
    result = parse_config(config)
    assert result["server"]["tags"] == []
