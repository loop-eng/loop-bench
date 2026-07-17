import ast
import inspect


def test_no_regex_import():
    """Verify that the parser module does not import the re module."""
    with open("src/config_parser.py", "r") as f:
        source = f.read()
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name != "re", "Parser still imports 're' module"
        if isinstance(node, ast.ImportFrom):
            assert node.module != "re", "Parser still imports from 're' module"


def test_no_regex_patterns():
    """Verify no regex pattern strings remain in the code."""
    with open("src/config_parser.py", "r") as f:
        source = f.read()
    # Check for common regex function calls
    assert "re.compile" not in source, "Parser still uses re.compile"
    assert "re.sub" not in source, "Parser still uses re.sub"
    assert "re.findall" not in source, "Parser still uses re.findall"
    assert "re.match" not in source, "Parser still uses re.match"
    assert "re.search" not in source, "Parser still uses re.search"
    assert "re.finditer" not in source, "Parser still uses re.finditer"
