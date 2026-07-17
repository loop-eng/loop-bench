from src.config_parser import parse_config


def test_deeply_nested():
    """Test 3 levels of nesting."""
    config = '''
level1 {
    a = "one"
    level2 {
        b = "two"
        level3 {
            c = "three"
        }
    }
}
'''
    result = parse_config(config)
    assert result["level1"]["a"] == "one"
    assert result["level1"]["level2"]["b"] == "two"
    assert result["level1"]["level2"]["level3"]["c"] == "three"


def test_multiple_nested_siblings():
    """Test multiple nested blocks at the same level."""
    config = '''
parent {
    child1 {
        x = 1
    }
    child2 {
        y = 2
    }
}
'''
    result = parse_config(config)
    assert result["parent"]["child1"]["x"] == 1
    assert result["parent"]["child2"]["y"] == 2
