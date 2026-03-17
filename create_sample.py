import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = str(Path(__file__).resolve().parent / "data" / "firewall.db")


async def create_sample_dataset() -> None:
    print(f"Connecting to {DB_PATH}...")
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if tables exist (verify init)
            async with db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='datasets'"
            ) as cursor:
                if not await cursor.fetchone():
                    print("Table 'datasets' does not exist. Initializing schema...")
                    await db.execute("""
                        CREATE TABLE IF NOT EXISTS datasets (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            is_public BOOLEAN DEFAULT 0,
                            metadata TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    await db.execute("""
                        CREATE TABLE IF NOT EXISTS traces (
                            id TEXT PRIMARY KEY,
                            session_id TEXT,
                            method TEXT,
                            verdict TEXT,
                            threat_level TEXT,
                            data TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    await db.execute("""
                        CREATE TABLE IF NOT EXISTS dataset_traces (
                            dataset_id TEXT,
                            trace_id TEXT,
                            PRIMARY KEY (dataset_id, trace_id),
                            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
                            FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
                        )
                    """)

            dataset_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()

            dataset = {
                "id": dataset_id,
                "name": "Sample Dataset (Created by Trae)",
                "is_public": False,
                "metadata": json.dumps(
                    {"description": "This is a test dataset created programmatically."}
                ),
                "created_at": now,
                "updated_at": now,
            }

            print(f"Inserting dataset: {dataset['name']} ({dataset['id']})")

            await db.execute(
                """
                INSERT INTO datasets (id, name, is_public, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    dataset["id"],
                    dataset["name"],
                    dataset["is_public"],
                    dataset["metadata"],
                    dataset["created_at"],
                    dataset["updated_at"],
                ),
            )
            await db.commit()
            print("✅ Successfully created sample dataset!")

    except Exception as e:
        print(f"❌ Failed to create dataset: {e}")


if __name__ == "__main__":
    asyncio.run(create_sample_dataset())
