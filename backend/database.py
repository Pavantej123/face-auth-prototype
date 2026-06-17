import sqlite3

DB_NAME = "users.db"


def get_connection():
    return sqlite3.connect(DB_NAME)


def init_db():
    conn = get_connection()

    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        descriptor TEXT NOT NULL,
        descriptors TEXT,
        created_at TEXT
    )
    """)

    cursor = conn.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    if "descriptors" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN descriptors TEXT")
    if "created_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT")

    conn.commit()
    conn.close()