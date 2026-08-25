import re

with open('backend/server.py', 'r') as f:
    code = f.read()

replacement = '''
                include_unpublished = query.get('include_unpublished', ['false'])[0].lower() == 'true'

                sql = """
                    SELECT r.id as result_id, r.programme_id, r.published, r.published_at, r.photo_url as result_photo, r.notes,
                           p.code as programme_code, p.name as programme_name, p.type as programme_type, p.format, p.stage_name,
                           c.name as category_name
                    FROM results r
                    JOIN programmes p ON r.programme_id = p.id
                    LEFT JOIN categories c ON p.category_id = c.id
                """
                if not include_unpublished:
                    sql += " WHERE r.published = 1"
                else:
                    sql += " WHERE 1=1"
                params = []
'''

code = re.sub(
    r"sql = '''\s*SELECT r\.id as result_id.*?\s*WHERE r\.published = 1\s*'''\s*params = \[\]",
    replacement,
    code,
    flags=re.DOTALL
)

with open('backend/server.py', 'w') as f:
    f.write(code)
print("Updated server.py")
