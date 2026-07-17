import pytest
from src.config_parser import parse_config, ParseError


def test_error_includes_line_number():
    """Error messages should include the line number where the error occurred."""
    bad_config = '''
database {
    host = "localhost"
    port = not_a_value
}
'''
    with pytest.raises(ParseError) as exc_info:
        parse_config(bad_config)
    error_msg = str(exc_info.value)
    assert "line" in error_msg.lower(), f"Error message should include line number: {error_msg}"


def test_unclosed_block_error():
    """Unclosed blocks should produce a clear error."""
    bad_config = '''
database {
    host = "localhost"
'''
    with pytest.raises(ParseError) as exc_info:
        parse_config(bad_config)
    error_msg = str(exc_info.value)
    assert "line" in error_msg.lower()


def test_invalid_key_error():
    """Invalid key names should produce a clear error."""
    bad_config = '''
database {
    123invalid = "value"
}
'''
    with pytest.raises(ParseError) as exc_info:
        parse_config(bad_config)
    error_msg = str(exc_info.value)
    assert "line" in error_msg.lower()


def test_missing_equals_error():
    """Missing equals sign should produce a clear error."""
    bad_config = '''
database {
    host "localhost"
}
'''
    with pytest.raises(ParseError) as exc_info:
        parse_config(bad_config)
    error_msg = str(exc_info.value)
    assert "line" in error_msg.lower()
