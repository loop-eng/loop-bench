import pytest
from src.config_parser import parse_config, ParseError


def test_simple_block():
    config = '''
    database {
        host = "localhost"
        port = 5432
    }
    '''
    result = parse_config(config)
    assert result["database"]["host"] == "localhost"
    assert result["database"]["port"] == 5432


def test_boolean_values():
    config = '''
    server {
        debug = true
        verbose = false
    }
    '''
    result = parse_config(config)
    assert result["server"]["debug"] is True
    assert result["server"]["verbose"] is False


def test_string_values():
    config = '''
    app {
        name = "my-application"
        version = "1.2.3"
    }
    '''
    result = parse_config(config)
    assert result["app"]["name"] == "my-application"
    assert result["app"]["version"] == "1.2.3"


def test_nested_block():
    config = '''
    database {
        host = "localhost"
        credentials {
            username = "admin"
            password = "secret"
        }
    }
    '''
    result = parse_config(config)
    assert result["database"]["host"] == "localhost"
    assert result["database"]["credentials"]["username"] == "admin"
    assert result["database"]["credentials"]["password"] == "secret"


def test_array_values():
    config = '''
    server {
        allowed_origins = ["http://localhost", "https://example.com"]
    }
    '''
    result = parse_config(config)
    assert result["server"]["allowed_origins"] == ["http://localhost", "https://example.com"]


def test_comments_ignored():
    config = '''
    # This is a comment
    database {
        # Another comment
        host = "localhost"
    }
    '''
    result = parse_config(config)
    assert result["database"]["host"] == "localhost"


def test_multiple_blocks():
    config = '''
    database {
        host = "localhost"
    }
    server {
        port = 8080
    }
    '''
    result = parse_config(config)
    assert "database" in result
    assert "server" in result


def test_float_values():
    config = '''
    pricing {
        rate = 29.99
        tax = 0.08
    }
    '''
    result = parse_config(config)
    assert result["pricing"]["rate"] == 29.99
    assert result["pricing"]["tax"] == 0.08


def test_empty_config():
    result = parse_config("")
    assert result == {}
