import pytest
from src.db import create_db, add_user, find_users, deactivate_user, count_users


@pytest.fixture
def db():
    conn = create_db(":memory:")
    yield conn
    conn.close()


class TestAddUser:
    def test_adds_user_and_returns_id(self, db):
        user_id = add_user(db, "Alice", "alice@example.com")
        assert isinstance(user_id, int)
        assert user_id >= 1

    def test_adds_multiple_users(self, db):
        id1 = add_user(db, "Alice", "alice@example.com")
        id2 = add_user(db, "Bob", "bob@example.com")
        assert id1 != id2


class TestFindUsers:
    def test_finds_user_by_name(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")

        results = find_users(db, name="Alice")
        assert len(results) == 1
        assert results[0]["name"] == "Alice"

    def test_finds_user_by_email(self, db):
        add_user(db, "Alice", "alice@example.com")

        results = find_users(db, email="alice@example.com")
        assert len(results) == 1
        assert results[0]["email"] == "alice@example.com"

    def test_returns_empty_for_no_match(self, db):
        add_user(db, "Alice", "alice@example.com")

        results = find_users(db, name="Nobody")
        assert len(results) == 0

    def test_returns_all_when_no_filter(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")

        results = find_users(db)
        assert len(results) == 2


class TestDeactivateUser:
    def test_deactivates_existing_user(self, db):
        user_id = add_user(db, "Alice", "alice@example.com")
        result = deactivate_user(db, user_id)
        assert result is True

    def test_returns_false_for_missing_user(self, db):
        result = deactivate_user(db, 9999)
        assert result is False


class TestCountUsers:
    def test_counts_all_active_users(self, db):
        add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")
        assert count_users(db) == 2

    def test_excludes_deactivated_from_active_count(self, db):
        uid = add_user(db, "Alice", "alice@example.com")
        add_user(db, "Bob", "bob@example.com")
        deactivate_user(db, uid)
        assert count_users(db, active_only=True) == 1
