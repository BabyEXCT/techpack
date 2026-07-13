"""
Export SQLite dev.db to JSON per table for Cloudflare D1 import.
"""

import json, os, sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'prisma', 'prisma', 'dev.db')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(OUT_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get list of tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [row[0] for row in cur.fetchall()]

all_data = {}
for table in tables:
    cur.execute(f"SELECT * FROM {table};")
    cols = [description[0] for description in cur.description]
    rows = cur.fetchall()
    records = [dict(zip(cols, row)) for row in rows]
    all_data[table] = records
    out_path = os.path.join(OUT_DIR, f"{table}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, default=str, indent=2)
    print(f"{table}: {len(records)} rows → {out_path}")

# combined file
combined_path = os.path.join(OUT_DIR, 'all.json')
with open(combined_path, 'w', encoding='utf-8') as f:
    json.dump(all_data, f, default=str, indent=2)
print(f"All tables exported to {combined_path}")

conn.close()
