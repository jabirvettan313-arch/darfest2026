import sqlite3

conn = sqlite3.connect('backend/artfest.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('''
    SELECT c.id as category_id, c.name as category_name,
           s.id as student_id, s.chest_no, s.name as student_name, s.photo_url, h.name as house_name, h.color as house_color,
           SUM(rw.points_awarded) as total_points
    FROM categories c
    JOIN programmes p ON c.id = p.category_id
    JOIN results r ON p.id = r.programme_id
    JOIN result_winners rw ON r.id = rw.result_id
    JOIN students s ON rw.chest_no = s.chest_no
    LEFT JOIN houses h ON s.house_id = h.id
    WHERE r.published = 1
    GROUP BY c.id, s.id
    ORDER BY c.id ASC, total_points DESC
''')

rows = cursor.fetchall()
res = {}
for r in rows:
    cid = r['category_id']
    if cid not in res:
        res[cid] = dict(r)

import json
print(json.dumps(list(res.values()), indent=2))
