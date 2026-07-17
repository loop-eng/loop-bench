import pytest
from src.db import create_db, add_user, find_users, count_users


@pytest.fixture
def db():
    conn = create_db(":memory:")
    yield conn
    conn.close()


class TestSQLInjectionPrevention:
    def test_injection_in_name_does_not_drop_table(self, db):
        add_user(db, "Alice", "alice@example.com")

        # This would drop the table if string formatting is used
        malicious_name = "'; DROP TABLE users; --"
        find_users(db, name=malicious_name)

        # Table should still exist and Alice should still be there
        results = find_users(db, name="Alice")
        assert len(results) == 1
        assert results[0]["name"] == "Alice"

    def test_injection_in_email_does_not_corrupt(self, db):
        add_user(db, "Alice", "alice@example.com")

        malicious_email = "' OR '1'='1"
        results = find_users(db, email=malicious_email)

        # Should return no results, not all users
        assert len(results) == 0

    def test_injection_does_not_return_all_rows(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")
        add_user(db, "Charlie", "charlie@example.com")

        # Classic OR injection that would return all rows
        malicious_name = "' OR '1'='1"
        results = find_users(db, name=malicious_name)
        assert len(results) == 0

    def test_special_characters_in_name_work(self, db):
        add_user(db, "O'Brien", "obrien@example.com")

        results = find_users(db, name="O'Brien")
        assert len(results) == 1
        assert results[0]["name"] == "O'Brien"

    def test_special_characters_in_email_work(self, db):
        add_user(db, "Test", "user+tag@example.com")

        results = find_users(db, email="user+tag@example.com")
        assert len(results) == 1

    def test_percent_and_underscore_are_literal(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")

        # These are SQL wildcards in LIKE, but should be literal in =
        results = find_users(db, name="%")
        assert len(results) == 0

        results = find_users(db, name="_lice")
        assert len(results) == 0

    def test_table_intact_after_multiple_injection_attempts(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")

        injection_payloads = [
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM sqlite_master; --",
            "' OR 1=1; --",
            "'; DELETE FROM users; --",
            "'; UPDATE users SET name='hacked'; --",
        ]

        for payload in injection_payloads:
            try:
                find_users(db, name=payload)
            except Exception:
                pass  # Some payloads may raise errors, that's fine

        # All original data must be intact
        assert count_users(db, active_only=False) == 2
        assert find_users(db, name="Alice")[0]["name"] == "Alice"
        assert find_users(db, name="Bob")[0]["name"] == "Bob"

    def test_parameterized_query_with_both_filters(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Alice", "alice2@example.com")

        results = find_users(db, name="Alice", email="alice@example.com")
        assert len(results) == 1
        assert results[0]["email"] == "alice@example.com"
