import re

with open('backend/server.py', 'r') as f:
    code = f.read()

code = code.replace(
    "cursor.execute('SELECT COUNT(*) FROM results WHERE published = 1')",
    "cursor.execute('SELECT COUNT(r.id) FROM results r JOIN programmes p ON r.programme_id = p.id WHERE r.published = 1')"
)

with open('backend/server.py', 'w') as f:
    f.write(code)
print("Fixed stats queries")
