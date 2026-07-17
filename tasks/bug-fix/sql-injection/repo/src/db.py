import sqlite3
from typing import Optional


def create_db(db_path: str = ":memory:") -> sqlite3.Connection:
    """Create and initialize the users database.

    Args:
        db_path: Path to the SQLite database file, or ":memory:" for in-memory.

    Returns:
        An open sqlite3.Connection with the users table created.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            active INTEGER DEFAULT 1
        )
        """
    )
    conn.commit()
    return conn


def add_user(conn: sqlite3.Connection, name: str, email: str) -> int:
    """Add a new user to the database.

    Args:
        conn: Database connection.
        name: User's display name.
        email: User's email address.

    Returns:
        The ID of the newly created user.
    """
    cursor = conn.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        (name, email),
    )
    conn.commit()
    return cursor.lastrowid


def find_users(
    conn: sqlite3.Connection,
    name: Optional[str] = None,
    email: Optional[str] = None,
) -> list[dict]:
    """Find users matching the given criteria.

    Args:
        conn: Database connection.
        name: Filter by exact name match.
        email: Filter by exact email match.

    Returns:
        A list of user dicts with id, name, email, and active fields.
    """
    query = "SELECT * FROM users WHERE 1=1"
    if name is not None:
        query += f" AND name = '{name}'"
    if email is not None:
        query += f" AND email = '{email}'"

    cursor = conn.execute(query)
    return [dict(row) for row in cursor.fetchall()]


def deactivate_user(conn: sqlite3.Connection, user_id: int) -> bool:
    """Deactivate a user by setting active = 0.

    Args:
        conn: Database connection.
        user_id: The ID of the user to deactivate.

    Returns:
        True if a user was updated, False if no user found.
    """
    cursor = conn.execute(
        "UPDATE users SET active = 0 WHERE id = ?",
        (user_id,),
    )
    conn.commit()
    return cursor.rowcount > 0


def count_users(conn: sqlite3.Connection, active_only: bool = True) -> int:
    """Count the number of users.

    Args:
        conn: Database connection.
        active_only: If True, only count active users.

    Returns:
        The count of matching users.
    """
    query = "SELECT COUNT(*) FROM users"
    if active_only:
        query += " WHERE active = 1"
    cursor = conn.execute(query)
    return cursor.fetchone()[0]
