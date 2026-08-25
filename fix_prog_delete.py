import re

with open('backend/server.py', 'r') as f:
    code = f.read()

replacement = '''
                prog_id = int(match_prog.group(1))
                
                # Find associated results to delete winners first
                cursor.execute('SELECT id FROM results WHERE programme_id = ?', (prog_id,))
                res_rows = cursor.fetchall()
                for r_row in res_rows:
                    cursor.execute('DELETE FROM result_winners WHERE result_id = ?', (r_row['id'],))
                
                # Delete results and the programme
                cursor.execute('DELETE FROM results WHERE programme_id = ?', (prog_id,))
                cursor.execute('DELETE FROM programmes WHERE id = ?', (prog_id,))
'''

code = re.sub(
    r"prog_id = int\(match_prog\.group\(1\)\)\s*cursor\.execute\('DELETE FROM programmes WHERE id = \?', \(prog_id,\)\)",
    replacement,
    code,
    flags=re.DOTALL
)

with open('backend/server.py', 'w') as f:
    f.write(code)
print("Fixed programme cascade delete.")
