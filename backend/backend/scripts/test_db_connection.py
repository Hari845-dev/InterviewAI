"""Test MongoDB Atlas connection — run: python scripts/test_db_connection.py"""

import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import get_settings


def mask_uri(uri: str) -> str:
    return re.sub(r":([^:@/]+)@", ":****@", uri)


async def main() -> None:
    settings = get_settings()
    uri = settings.mongodb_uri.strip().strip('"').strip("'")

    print("=== MongoDB Connection Test ===")
    print(f"Env file expected at: {Path(__file__).resolve().parents[1] / '.env'}")
    print(f"Database name: {settings.database_name}")
    print(f"URI (masked): {mask_uri(uri)}")

    if "<" in uri or ">" in uri or "password" in uri.lower():
        print("\nERROR: URI still contains placeholders like <password>.")
        print("Replace with your real Database Access username and password from Atlas.")
        sys.exit(1)

    parsed = urlparse(uri.replace("mongodb+srv://", "https://").replace("mongodb://", "http://"))
    if not parsed.username:
        print("\nERROR: No username found in MONGODB_URI.")
        sys.exit(1)
    if not parsed.password:
        print("\nERROR: No password found in MONGODB_URI.")
        print("If your password has special characters (@ # : / %), URL-encode them.")
        sys.exit(1)

    print(f"Username detected: {parsed.username}")
    print("Password detected: yes (hidden)")

    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=8000)
    try:
        await client.admin.command("ping")
        db = client[settings.database_name]
        collections = await db.list_collection_names()
        print("\nSUCCESS: Connected to MongoDB Atlas!")
        print(f"Collections in '{settings.database_name}': {collections or '(none yet)'}")
    except Exception as exc:
        err = str(exc)
        print(f"\nFAILED: {err}")
        if "bad auth" in err.lower() or "authentication failed" in err.lower():
            print("\nFix checklist:")
            print("  1. Atlas -> Database Access -> verify user exists")
            print("  2. Use DATABASE USER credentials (not your mongodb.com login)")
            print("  3. Reset password in Atlas -> Autogenerate -> update .env")
            print("  4. URL-encode special chars in password (@ -> %40, # -> %23)")
            print("  5. No quotes/spaces around the URI in .env")
            print("\nExample .env line:")
            print("MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>")
        elif "timed out" in err.lower():
            print("\nNetwork issue: Atlas -> Network Access -> add your IP (or 0.0.0.0/0 for dev)")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
