"""Reset demo data to the starting state (serving #12, Rahim = #17):  python reset_demo.py"""
from app.db import get_db
from app.seed import seed

db = get_db()
for name in ("doctors", "chambers", "queue", "pharmacies", "queue_state"):
    db[name].drop()
print("Reseeded" if seed() else "Nothing seeded")
