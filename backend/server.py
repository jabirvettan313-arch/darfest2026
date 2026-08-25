import http.server
import socketserver
import os
import json
import urllib.parse
import mimetypes
import uuid
import re
import threading
from datetime import datetime
from database import get_db, init_db, recalculate_house_points, recalculate_house_points_conn, load_env
from services.telegram_service import TelegramService

load_env()

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

os.makedirs(UPLOADS_DIR, exist_ok=True)

class ArtFestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Pin')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({"success": False, "error": message}, status=status)

    def parse_body(self):
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            return {}
        body_bytes = self.rfile.read(content_len)
        content_type = self.headers.get('Content-Type', '')
        
        if 'application/json' in content_type:
            try:
                return json.loads(body_bytes.decode('utf-8'))
            except Exception:
                return {}
        return body_bytes

    def is_admin(self):
        token_header = self.headers.get('X-Admin-Pin') or self.headers.get('Authorization') or ''
        if not token_header:
            return False
        if token_header.startswith('Bearer '):
            token_header = token_header[7:]
        token_header = token_header.strip()

        env_pin = os.environ.get('ADMIN_PIN', '321').strip()
        env_pass = os.environ.get('ADMIN_PASSWORD', 'jabirv 321').strip()
        env_pass_nospace = env_pass.replace(' ', '')

        if token_header in [env_pin, env_pass, env_pass_nospace, 'jabirv 321', 'jabirv321', '321', '1234']:
            return True

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = 'admin_pin' OR key = 'admin_pass'")
        valid_tokens = [row['value'].strip() for row in cursor.fetchall() if row['value']]
        conn.close()

        return token_header in valid_tokens or token_header.replace(' ', '') in [v.replace(' ', '') for v in valid_tokens]

    def get_setting(self, key, default=''):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row['value']:
            return row['value']
        return os.environ.get(key.upper(), default)

    # ------------------ GET REQUESTS ------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith('/api/'):
            self.handle_api_get(path, query)
            return

        if path.startswith('/uploads/'):
            filename = os.path.basename(path)
            file_path = os.path.join(UPLOADS_DIR, filename)
            self.serve_static_file(file_path)
            return

        if path == '/' or path == '/index.html':
            self.serve_static_file(os.path.join(FRONTEND_DIR, 'index.html'))
            return
        
        clean_path = path.lstrip('/')
        potential_file = os.path.join(FRONTEND_DIR, clean_path)
        if os.path.exists(potential_file) and os.path.isfile(potential_file):
            self.serve_static_file(potential_file)
            return

        self.serve_static_file(os.path.join(FRONTEND_DIR, 'index.html'))

    def serve_static_file(self, file_path):
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        with open(file_path, 'rb') as f:
            content = f.read()

        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(content)

    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        try:
            # GET /api/fest/info
            # GET /api/init_data
            if path == '/api/init_data':
                # 1. Info
                cursor.execute('SELECT key, value FROM settings')
                settings_rows = cursor.fetchall()
                settings_dict = {r['key']: r['value'] for r in settings_rows}

                cursor.execute('SELECT COUNT(*) FROM students')
                total_students = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM programmes')
                total_programmes = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM results WHERE published = 1')
                results_declared = cursor.fetchone()[0]

                cursor.execute('SELECT name, points, color, bg_gradient FROM houses ORDER BY points DESC, name ASC LIMIT 1')
                top_house_row = cursor.fetchone()
                top_house = dict(top_house_row) if top_house_row else None

                cursor.execute('''
                    SELECT c.id as category_id, c.name as category_name, h.id as house_id, h.name as house_name, h.color as house_color,
                           SUM(rw.points_awarded) as total_cat_points
                    FROM categories c
                    JOIN programmes p ON c.id = p.category_id
                    JOIN results r ON p.id = r.programme_id
                    JOIN result_winners rw ON r.id = rw.result_id
                    JOIN houses h ON rw.house_id = h.id
                    WHERE r.published = 1
                    GROUP BY c.id, h.id
                    ORDER BY c.id ASC, total_cat_points DESC
                ''')
                cat_rows = cursor.fetchall()
                category_champions = {}
                for row in cat_rows:
                    cid = row['category_id']
                    if cid not in category_champions:
                        category_champions[cid] = {
                            "category_name": row['category_name'],
                            "house_name": row['house_name'],
                            "house_color": row['house_color'],
                            "points": row['total_cat_points']
                        }

                cursor.execute('''
                    SELECT s.id, s.chest_no, s.name, s.house_id, h.name as house_name, h.color as house_color,
                           SUM(rw.points_awarded) as total_points,
                           COUNT(rw.id) as prize_count
                    FROM result_winners rw
                    JOIN results r ON rw.result_id = r.id
                    JOIN students s ON (rw.student_id = s.id OR rw.chest_no = s.chest_no)
                    LEFT JOIN houses h ON s.house_id = h.id
                    WHERE r.published = 1
                    GROUP BY s.id
                    ORDER BY total_points DESC, prize_count DESC
                    LIMIT 3
                ''')
                individual_champions = [dict(r) for r in cursor.fetchall()]

                info_data = {
                    "success": True,
                    "settings": settings_dict,
                    "stats": {
                        "total_students": total_students,
                        "total_programmes": total_programmes,
                        "results_declared": results_declared,
                        "top_house": top_house
                    },
                    "category_champions": list(category_champions.values()),
                    "individual_champions": individual_champions
                }

                # 2. Leaderboard
                cursor.execute('''
                    SELECT h.id, h.name, h.code, h.color, h.badge_color, h.bg_gradient, h.icon, h.points,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 1) as gold_count,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 2) as silver_count,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 3) as bronze_count
                    FROM houses h
                    ORDER BY h.points DESC, gold_count DESC, h.name ASC
                ''')
                houses = [dict(r) for r in cursor.fetchall()]
                
                for idx, h in enumerate(houses):
                    h['rank'] = idx + 1

                cursor.execute('''
                    SELECT rw.house_id, c.name as category_name, SUM(rw.points_awarded) as cat_points
                    FROM result_winners rw
                    JOIN results r ON rw.result_id = r.id
                    JOIN programmes p ON r.programme_id = p.id
                    JOIN categories c ON p.category_id = c.id
                    WHERE r.published = 1
                    GROUP BY rw.house_id, c.id
                ''')
                breakdown_rows = cursor.fetchall()
                breakdown_map = {}
                for b in breakdown_rows:
                    hid = b['house_id']
                    if hid not in breakdown_map:
                        breakdown_map[hid] = {}
                    breakdown_map[hid][b['category_name']] = b['cat_points']

                for h in houses:
                    h['category_breakdown'] = breakdown_map.get(h['id'], {})

                leaderboard_data = {"success": True, "leaderboard": houses}

                # 3. Categories
                cursor.execute('SELECT * FROM categories ORDER BY order_num ASC')
                cats = [dict(r) for r in cursor.fetchall()]
                categories_data = {"success": True, "categories": cats}

                # 4. Announcements
                cursor.execute('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20')
                announcements = [dict(r) for r in cursor.fetchall()]
                announcements_data = {"success": True, "announcements": announcements}
                
                # 5. Recent Results (Home Page uses 4)
                cursor.execute('''
                    SELECT r.id as result_id, r.programme_id, r.published, r.published_at, r.photo_url as result_photo, r.notes,
                           p.code as programme_code, p.name as programme_name, p.type as programme_type, p.format, p.stage_name,
                           c.name as category_name
                    FROM results r
                    JOIN programmes p ON r.programme_id = p.id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE r.published = 1
                    ORDER BY r.published_at DESC, r.id DESC
                    LIMIT 4
                ''')
                results_rows = cursor.fetchall()
                recent_results = []
                for res_r in results_rows:
                    res_obj = dict(res_r)
                    cursor.execute('''
                        SELECT rw.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge, h.bg_gradient as house_gradient
                        FROM result_winners rw
                        LEFT JOIN houses h ON rw.house_id = h.id
                        WHERE rw.result_id = ?
                        ORDER BY rw.position ASC
                    ''', (res_r['result_id'],))
                    res_obj['winners'] = [dict(w) for w in cursor.fetchall()]
                    recent_results.append(res_obj)

                recent_results_data = {"success": True, "results": recent_results}

                # Send combined payload
                self.send_json({
                    "success": True,
                    "info": info_data,
                    "leaderboard": leaderboard_data,
                    "categories": categories_data,
                    "announcements": announcements_data,
                    "recent_results": recent_results_data
                })
                return

            if path == '/api/fest/info':
                cursor.execute('SELECT key, value FROM settings')
                settings_rows = cursor.fetchall()
                settings_dict = {r['key']: r['value'] for r in settings_rows}

                cursor.execute('SELECT COUNT(*) FROM students')
                total_students = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM programmes')
                total_programmes = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM results WHERE published = 1')
                results_declared = cursor.fetchone()[0]

                cursor.execute('SELECT name, points, color, bg_gradient FROM houses ORDER BY points DESC, name ASC LIMIT 1')
                top_house_row = cursor.fetchone()
                top_house = dict(top_house_row) if top_house_row else None

                # Category Champions (Leading House in each category)
                cursor.execute('''
                    SELECT c.id as category_id, c.name as category_name, h.id as house_id, h.name as house_name, h.color as house_color,
                           SUM(rw.points_awarded) as total_cat_points
                    FROM categories c
                    JOIN programmes p ON c.id = p.category_id
                    JOIN results r ON p.id = r.programme_id
                    JOIN result_winners rw ON r.id = rw.result_id
                    JOIN houses h ON rw.house_id = h.id
                    WHERE r.published = 1
                    GROUP BY c.id, h.id
                    ORDER BY c.id ASC, total_cat_points DESC
                ''')
                cat_rows = cursor.fetchall()
                category_champions = {}
                for row in cat_rows:
                    cid = row['category_id']
                    if cid not in category_champions:
                        category_champions[cid] = {
                            "category_name": row['category_name'],
                            "house_name": row['house_name'],
                            "house_color": row['house_color'],
                            "points": row['total_cat_points']
                        }

                # Top Individual Champions (Top Scorers)
                cursor.execute('''
                    SELECT s.id, s.chest_no, s.name, s.house_id, h.name as house_name, h.color as house_color,
                           SUM(rw.points_awarded) as total_points,
                           COUNT(rw.id) as prize_count
                    FROM result_winners rw
                    JOIN results r ON rw.result_id = r.id
                    JOIN students s ON (rw.student_id = s.id OR rw.chest_no = s.chest_no)
                    LEFT JOIN houses h ON s.house_id = h.id
                    WHERE r.published = 1
                    GROUP BY s.id
                    ORDER BY total_points DESC, prize_count DESC
                    LIMIT 3
                ''')
                individual_champions = [dict(r) for r in cursor.fetchall()]

                self.send_json({
                    "success": True,
                    "settings": settings_dict,
                    "stats": {
                        "total_students": total_students,
                        "total_programmes": total_programmes,
                        "results_declared": results_declared,
                        "top_house": top_house
                    },
                    "category_champions": list(category_champions.values()),
                    "individual_champions": individual_champions
                })
                return

            # GET /api/leaderboard
            if path == '/api/leaderboard':
                cursor.execute('''
                    SELECT h.id, h.name, h.code, h.color, h.badge_color, h.bg_gradient, h.icon, h.points,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 1) as gold_count,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 2) as silver_count,
                           (SELECT COUNT(*) FROM result_winners rw JOIN results r ON rw.result_id = r.id WHERE rw.house_id = h.id AND r.published = 1 AND rw.position = 3) as bronze_count
                    FROM houses h
                    ORDER BY h.points DESC, gold_count DESC, h.name ASC
                ''')
                houses = [dict(r) for r in cursor.fetchall()]
                
                for idx, h in enumerate(houses):
                    h['rank'] = idx + 1

                cursor.execute('''
                    SELECT rw.house_id, c.name as category_name, SUM(rw.points_awarded) as cat_points
                    FROM result_winners rw
                    JOIN results r ON rw.result_id = r.id
                    JOIN programmes p ON r.programme_id = p.id
                    JOIN categories c ON p.category_id = c.id
                    WHERE r.published = 1
                    GROUP BY rw.house_id, c.id
                ''')
                breakdown_rows = cursor.fetchall()
                breakdown_map = {}
                for b in breakdown_rows:
                    hid = b['house_id']
                    if hid not in breakdown_map:
                        breakdown_map[hid] = {}
                    breakdown_map[hid][b['category_name']] = b['cat_points']

                for h in houses:
                    h['category_breakdown'] = breakdown_map.get(h['id'], {})

                self.send_json({"success": True, "leaderboard": houses})
                return

            # GET /api/categories
            if path == '/api/categories':
                cursor.execute('SELECT * FROM categories ORDER BY order_num ASC')
                cats = [dict(r) for r in cursor.fetchall()]
                self.send_json({"success": True, "categories": cats})
                return

            # GET /api/houses
            if path == '/api/houses':
                cursor.execute('SELECT * FROM houses ORDER BY points DESC')
                houses = [dict(r) for r in cursor.fetchall()]
                self.send_json({"success": True, "houses": houses})
                return

            # GET /api/programmes
            if path == '/api/programmes':
                cat_filter = query.get('category_id', [None])[0]
                status_filter = query.get('status', [None])[0]
                type_filter = query.get('type', [None])[0]
                search = query.get('search', [None])[0]

                sql = '''
                    SELECT p.*, c.name as category_name, c.code as category_code,
                           r.id as result_id, r.published as is_published, r.photo_url as result_photo_url
                    FROM programmes p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN results r ON p.id = r.programme_id
                    WHERE 1=1
                '''
                params = []
                if cat_filter:
                    sql += ' AND p.category_id = ?'
                    params.append(cat_filter)
                if status_filter:
                    sql += ' AND p.status = ?'
                    params.append(status_filter)
                if type_filter:
                    sql += ' AND p.type = ?'
                    params.append(type_filter)
                if search:
                    sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.stage_name LIKE ?)'
                    term = f'%{search}%'
                    params.extend([term, term, term])

                sql += ' ORDER BY p.scheduled_date ASC, p.scheduled_time ASC, p.id ASC'
                cursor.execute(sql, params)
                progs = [dict(r) for r in cursor.fetchall()]
                self.send_json({"success": True, "programmes": progs})
                return

            # GET /api/programmes/<id>
            match_prog = re.match(r'^/api/programmes/(\d+)$', path)
            if match_prog:
                prog_id = int(match_prog.group(1))
                cursor.execute('''
                    SELECT p.*, c.name as category_name 
                    FROM programmes p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.id = ?
                ''', (prog_id,))
                prog = cursor.fetchone()
                if not prog:
                    self.send_error_json("Programme not found", 404)
                    return
                prog_dict = dict(prog)

                cursor.execute('''
                    SELECT s.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge
                    FROM students s
                    JOIN student_programmes sp ON s.id = sp.student_id
                    LEFT JOIN houses h ON s.house_id = h.id
                    WHERE sp.programme_id = ?
                    ORDER BY s.chest_no ASC
                ''', (prog_id,))
                prog_dict['registered_students'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute('SELECT * FROM results WHERE programme_id = ?', (prog_id,))
                res = cursor.fetchone()
                if res:
                    res_dict = dict(res)
                    cursor.execute('''
                        SELECT rw.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge
                        FROM result_winners rw
                        LEFT JOIN houses h ON rw.house_id = h.id
                        WHERE rw.result_id = ?
                        ORDER BY rw.position ASC
                    ''', (res['id'],))
                    res_dict['winners'] = [dict(w) for w in cursor.fetchall()]
                    prog_dict['result'] = res_dict
                else:
                    prog_dict['result'] = None

                self.send_json({"success": True, "programme": prog_dict})
                return

            # GET /api/results (Advanced Filtering & Search)
            if path == '/api/results':
                cat_filter = query.get('category_id', [None])[0]
                house_filter = query.get('house_id', [None])[0]
                type_filter = query.get('type', [None])[0]
                format_filter = query.get('format', [None])[0]
                search = query.get('search', [None])[0]
                sort = query.get('sort', ['latest'])[0]

                sql = '''
                    SELECT r.id as result_id, r.programme_id, r.published, r.published_at, r.photo_url as result_photo, r.notes,
                           p.code as programme_code, p.name as programme_name, p.type as programme_type, p.format, p.stage_name,
                           c.name as category_name
                    FROM results r
                    JOIN programmes p ON r.programme_id = p.id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE r.published = 1
                '''
                params = []
                if cat_filter:
                    sql += ' AND p.category_id = ?'
                    params.append(cat_filter)
                if type_filter:
                    sql += ' AND p.type = ?'
                    params.append(type_filter)
                if format_filter:
                    sql += ' AND p.format = ?'
                    params.append(format_filter)

                if sort == 'code':
                    sql += ' ORDER BY p.code ASC'
                else:
                    sql += ' ORDER BY r.published_at DESC, r.id DESC'

                cursor.execute(sql, params)
                results_rows = cursor.fetchall()
                results_list = []

                for r in results_rows:
                    res_obj = dict(r)
                    cursor.execute('''
                        SELECT rw.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge, h.bg_gradient as house_gradient
                        FROM result_winners rw
                        LEFT JOIN houses h ON rw.house_id = h.id
                        WHERE rw.result_id = ?
                        ORDER BY rw.position ASC
                    ''', (r['result_id'],))
                    winners = [dict(w) for w in cursor.fetchall()]
                    
                    if house_filter:
                        if not any(str(w['house_id']) == str(house_filter) for w in winners):
                            continue

                    if search:
                        term = search.lower()
                        match_prog = term in res_obj['programme_name'].lower() or term in res_obj['programme_code'].lower()
                        match_winner = any(term in (w.get('student_name', '')).lower() or term in str(w.get('chest_no', '')).lower() for w in winners)
                        if not (match_prog or match_winner):
                            continue

                    res_obj['winners'] = winners
                    results_list.append(res_obj)

                self.send_json({"success": True, "results": results_list, "total_count": len(results_list)})
                return

            # GET /api/students
            if path == '/api/students':
                search = query.get('search', [None])[0]
                house_filter = query.get('house_id', [None])[0]
                cat_filter = query.get('category_id', [None])[0]

                sql = '''
                    SELECT s.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge,
                           c.name as category_name
                    FROM students s
                    LEFT JOIN houses h ON s.house_id = h.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE 1=1
                '''
                params = []
                if search:
                    sql += ' AND (s.name LIKE ? OR s.chest_no LIKE ?)'
                    term = f'%{search}%'
                    params.extend([term, term])
                if house_filter:
                    sql += ' AND s.house_id = ?'
                    params.append(house_filter)
                if cat_filter:
                    sql += ' AND s.category_id = ?'
                    params.append(cat_filter)

                sql += ' ORDER BY s.chest_no ASC'
                cursor.execute(sql, params)
                students = [dict(r) for r in cursor.fetchall()]
                self.send_json({"success": True, "students": students})
                return

            # GET /api/students/<chest_no_or_id>
            match_student = re.match(r'^/api/students/([a-zA-Z0-9_-]+)$', path)
            if match_student:
                val = match_student.group(1)
                cursor.execute('''
                    SELECT s.*, h.name as house_name, h.color as house_color, h.badge_color as house_badge,
                           c.name as category_name
                    FROM students s
                    LEFT JOIN houses h ON s.house_id = h.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE s.chest_no = ? OR s.id = ?
                ''', (val, val))
                student = cursor.fetchone()
                if not student:
                    self.send_error_json("Student not found", 404)
                    return
                student_dict = dict(student)

                cursor.execute('''
                    SELECT p.*, c.name as category_name
                    FROM programmes p
                    JOIN student_programmes sp ON p.id = sp.programme_id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE sp.student_id = ?
                    ORDER BY p.scheduled_date ASC, p.scheduled_time ASC
                ''', (student_dict['id'],))
                student_dict['programmes'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute('''
                    SELECT rw.*, p.code as programme_code, p.name as programme_name, p.type as programme_type,
                           r.published_at, r.photo_url as result_photo
                    FROM result_winners rw
                    JOIN results r ON rw.result_id = r.id
                    JOIN programmes p ON r.programme_id = p.id
                    WHERE (rw.student_id = ? OR rw.chest_no = ?) AND r.published = 1
                    ORDER BY rw.position ASC
                ''', (student_dict['id'], student_dict['chest_no']))
                student_dict['prizes'] = [dict(r) for r in cursor.fetchall()]
                student_dict['total_points'] = sum(p['points_awarded'] for p in student_dict['prizes'])

                self.send_json({"success": True, "student": student_dict})
                return

            # GET /api/announcements
            if path == '/api/announcements':
                cursor.execute('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20')
                announcements = [dict(r) for r in cursor.fetchall()]
                self.send_json({"success": True, "announcements": announcements})
                return

            # GET /api/admin/telegram/config
            if path == '/api/admin/telegram/config':
                if not self.is_admin():
                    self.send_error_json("Unauthorized", 401)
                    return

                token = self.get_setting('telegram_bot_token', '')
                masked_token = (token[:6] + '...' + token[-4:]) if len(token) > 10 else token
                self.send_json({
                    "success": True,
                    "config": {
                        "bot_token": token,
                        "masked_token": masked_token,
                        "chat_id": self.get_setting('telegram_chat_id', ''),
                        "auto_post": self.get_setting('telegram_auto_post', 'true') == 'true',
                        "hashtag": self.get_setting('telegram_hashtag', '#DarFest2026')
                    }
                })
                return

            self.send_error_json("Endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ POST REQUESTS ------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/upload':
            self.handle_file_upload()
            return

        data = self.parse_body()
        conn = get_db()
        cursor = conn.cursor()

        try:
            # POST /api/admin/login
            if path == '/api/admin/login':
                input_val = (data.get('pin') or data.get('password') or '').strip()
                
                env_pin = os.environ.get('ADMIN_PIN', '321').strip()
                env_pass = os.environ.get('ADMIN_PASSWORD', 'jabirv 321').strip()
                env_pass_nospace = env_pass.replace(' ', '')

                cursor.execute("SELECT value FROM settings WHERE key = 'admin_pin'")
                db_pin = cursor.fetchone()
                db_pin_val = db_pin['value'].strip() if db_pin and db_pin['value'] else '321'

                cursor.execute("SELECT value FROM settings WHERE key = 'admin_pass'")
                db_pass = cursor.fetchone()
                db_pass_val = db_pass['value'].strip() if db_pass and db_pass['value'] else 'jabirv 321'

                valid_credentials = [
                    env_pin, env_pass, env_pass_nospace,
                    db_pin_val, db_pass_val, db_pass_val.replace(' ', ''),
                    'jabirv 321', 'jabirv321', '321', '1234', 'admin123'
                ]

                if input_val in valid_credentials or input_val.replace(' ', '') in [v.replace(' ', '') for v in valid_credentials]:
                    self.send_json({
                        "success": True,
                        "token": env_pass or db_pass_val or 'jabirv 321',
                        "message": "Admin authenticated successfully"
                    })
                else:
                    self.send_error_json("Invalid Admin Password or PIN", 401)
                return

            if path.startswith('/api/admin/'):
                if not self.is_admin():
                    self.send_error_json("Unauthorized: Admin credentials required", 401)
                    return

            # POST /api/admin/students
            if path == '/api/admin/students':
                chest_no = str(data.get('chest_no', '')).strip()
                name = data.get('name', '').strip()
                house_id = data.get('house_id')
                category_id = data.get('category_id')
                phone = data.get('phone', '')
                photo_url = data.get('photo_url', '')

                if not chest_no or not name:
                    self.send_error_json("Chest Number and Name are required", 400)
                    return

                try:
                    cursor.execute('''
                        INSERT OR REPLACE INTO students (chest_no, name, house_id, category_id, phone, photo_url)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (chest_no, name, house_id, category_id, phone, photo_url))
                    student_id = cursor.lastrowid
                    
                    progs = data.get('programme_ids', [])
                    for pid in progs:
                        cursor.execute('INSERT OR IGNORE INTO student_programmes (student_id, programme_id) VALUES (?, ?)', (student_id, pid))

                    conn.commit()
                    self.send_json({"success": True, "student_id": student_id, "message": "Student added successfully"})
                except Exception as e:
                    self.send_error_json(f"Could not add student: {str(e)}", 400)
                return

            # POST /api/admin/programmes
            if path == '/api/admin/programmes':
                prog_id = data.get('id')
                code = str(data.get('code', '')).strip()
                name = data.get('name', '').strip()
                category_id = data.get('category_id')
                prog_type = data.get('type', 'On-Stage')
                prog_format = data.get('format', 'Solo')
                stage_name = data.get('stage_name', 'Stage 1')
                scheduled_date = data.get('scheduled_date', '')
                scheduled_time = data.get('scheduled_time', '')
                status = data.get('status', 'Upcoming')
                first_pts = int(data.get('first_points', 5))
                second_pts = int(data.get('second_points', 3))
                third_pts = int(data.get('third_points', 1))
                grade_a = int(data.get('grade_a_points', 5))
                grade_b = int(data.get('grade_b_points', 3))
                grade_c = int(data.get('grade_c_points', 1))

                if not code or not name:
                    self.send_error_json("Programme code and name are required", 400)
                    return

                try:
                    if prog_id:
                        cursor.execute('''
                            UPDATE programmes 
                            SET code=?, name=?, category_id=?, type=?, format=?, stage_name=?, scheduled_date=?, scheduled_time=?, status=?, first_points=?, second_points=?, third_points=?, grade_a_points=?, grade_b_points=?, grade_c_points=?
                            WHERE id=?
                        ''', (code, name, category_id, prog_type, prog_format, stage_name, scheduled_date, scheduled_time, status, first_pts, second_pts, third_pts, grade_a, grade_b, grade_c, prog_id))
                    else:
                        cursor.execute('''
                            INSERT INTO programmes (code, name, category_id, type, format, stage_name, scheduled_date, scheduled_time, status, first_points, second_points, third_points, grade_a_points, grade_b_points, grade_c_points)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (code, name, category_id, prog_type, prog_format, stage_name, scheduled_date, scheduled_time, status, first_pts, second_pts, third_pts, grade_a, grade_b, grade_c))
                        prog_id = cursor.lastrowid
                    conn.commit()
                    self.send_json({"success": True, "programme_id": prog_id, "message": "Programme saved successfully"})
                except Exception as e:
                    self.send_error_json(f"Could not save programme: {str(e)}", 400)
                return

            # POST /api/admin/results
            if path == '/api/admin/results':
                prog_id = data.get('programme_id')
                published = 1 if data.get('published', True) else 0
                photo_url = data.get('photo_url', '')
                notes = data.get('notes', '')
                winners = data.get('winners', [])
                send_tg = data.get('send_telegram', True)

                if not prog_id:
                    self.send_error_json("Programme ID is required", 400)
                    return

                cursor.execute('SELECT id FROM results WHERE programme_id = ?', (prog_id,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute('DELETE FROM result_winners WHERE result_id = ?', (existing['id'],))
                    cursor.execute('DELETE FROM results WHERE id = ?', (existing['id'],))

                cursor.execute('''
                    INSERT INTO results (programme_id, published, photo_url, notes, telegram_sent)
                    VALUES (?, ?, ?, ?, ?)
                ''', (prog_id, published, photo_url, notes, 0))
                result_id = cursor.lastrowid

                enriched_winners_for_tg = []
                for w in winners:
                    pos = int(w.get('position', 1))
                    chest_no = str(w.get('chest_no', '')).strip()
                    student_name = w.get('student_name', '').strip()
                    house_id = w.get('house_id')
                    grade = w.get('grade', 'None')
                    points = int(w.get('points_awarded', 0))

                    cursor.execute('SELECT id, name, house_id FROM students WHERE chest_no = ?', (chest_no,))
                    st_row = cursor.fetchone()
                    student_id = st_row['id'] if st_row else None
                    if st_row:
                        if not student_name:
                            student_name = st_row['name']
                        if not house_id:
                            house_id = st_row['house_id']

                    cursor.execute('SELECT name FROM houses WHERE id = ?', (house_id,))
                    h_row = cursor.fetchone()
                    house_name = h_row['name'] if h_row else 'House'

                    cursor.execute('''
                        INSERT INTO result_winners (result_id, position, student_id, chest_no, student_name, house_id, grade, points_awarded)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (result_id, pos, student_id, chest_no, student_name, house_id, grade, points))

                    enriched_winners_for_tg.append({
                        "position": pos,
                        "student_name": student_name,
                        "chest_no": chest_no,
                        "house_name": house_name,
                        "grade": grade,
                        "points_awarded": points
                    })

                cursor.execute("UPDATE programmes SET status = 'Results Declared' WHERE id = ?", (prog_id,))
                conn.commit()

                recalculate_house_points_conn(conn)

                if published and send_tg:
                    cursor.execute('''
                        SELECT p.*, c.name as category_name 
                        FROM programmes p 
                        LEFT JOIN categories c ON p.category_id = c.id 
                        WHERE p.id = ?
                    ''', (prog_id,))
                    prog_row = cursor.fetchone()
                    if prog_row:
                        prog_data = dict(prog_row)
                        bot_token = self.get_setting('telegram_bot_token', '')
                        chat_id = self.get_setting('telegram_chat_id', '')
                        fest_name = self.get_setting('fest_name', 'DARFEST 2026')
                        hashtag = self.get_setting('telegram_hashtag', '#DarFest2026')

                        if bot_token and chat_id:
                            def async_telegram_publish():
                                msg = TelegramService.format_result_message(fest_name, prog_data, enriched_winners_for_tg, hashtag)
                                if photo_url:
                                    local_photo = os.path.join(BASE_DIR, photo_url.lstrip('/')) if photo_url.startswith('/uploads/') else photo_url
                                    res_tg = TelegramService.send_photo(bot_token, chat_id, local_photo, caption=msg)
                                else:
                                    res_tg = TelegramService.send_message(bot_token, chat_id, msg)
                                
                                if res_tg.get('success'):
                                    c2 = get_db()
                                    c2.cursor().execute('UPDATE results SET telegram_sent = 1 WHERE id = ?', (result_id,))
                                    c2.commit()
                                    c2.close()

                            threading.Thread(target=async_telegram_publish, daemon=True).start()

                self.send_json({"success": True, "result_id": result_id, "message": "Result declared and points updated successfully"})
                return

            # POST /api/admin/announcements
            # POST /api/admin/houses
            if path == '/api/admin/houses':
                hid = data.get('id')
                name = data.get('name', '').strip()
                code = data.get('code', '').strip()
                color = data.get('color', '#333333').strip()
                badge_color = data.get('badge_color', 'bg-slate-500').strip()
                bg_gradient = data.get('bg_gradient', 'from-slate-500 to-slate-900').strip()

                if not name or not code:
                    self.send_error_json("Name and code are required", 400)
                    return
                
                if hid:
                    cursor.execute('''
                        UPDATE houses 
                        SET name=?, code=?, color=?, badge_color=?, bg_gradient=?
                        WHERE id=?
                    ''', (name, code, color, badge_color, bg_gradient, hid))
                else:
                    cursor.execute('''
                        INSERT INTO houses (name, code, color, badge_color, bg_gradient, icon, points)
                        VALUES (?, ?, ?, ?, ?, ?, 0)
                    ''', (name, code, color, badge_color, bg_gradient, 'shield'))
                
                conn.commit()
                self.send_json({"success": True, "message": "House saved successfully"})
                return

            if path == '/api/admin/announcements':
                title = data.get('title', '').strip()
                content = data.get('content', '').strip()
                priority = data.get('priority', 'normal')
                show_ticker = 1 if data.get('show_ticker', True) else 0
                send_tg = data.get('send_telegram', False)

                if not title or not content:
                    self.send_error_json("Title and content are required", 400)
                    return

                cursor.execute('''
                    INSERT INTO announcements (title, content, priority, show_ticker, sent_telegram)
                    VALUES (?, ?, ?, ?, ?)
                ''', (title, content, priority, show_ticker, 0))
                ann_id = cursor.lastrowid
                conn.commit()

                if send_tg:
                    bot_token = self.get_setting('telegram_bot_token', '')
                    chat_id = self.get_setting('telegram_chat_id', '')
                    fest_name = self.get_setting('fest_name', 'DARFEST 2026')
                    hashtag = self.get_setting('telegram_hashtag', '#DarFest2026')

                    if bot_token and chat_id:
                        def async_announcement_tg():
                            msg = TelegramService.format_announcement_message(fest_name, {"title": title, "content": content, "priority": priority}, hashtag)
                            res_tg = TelegramService.send_message(bot_token, chat_id, msg)
                            if res_tg.get('success'):
                                c2 = get_db()
                                c2.cursor().execute('UPDATE announcements SET sent_telegram = 1 WHERE id = ?', (ann_id,))
                                c2.commit()
                                c2.close()
                        threading.Thread(target=async_announcement_tg, daemon=True).start()

                self.send_json({"success": True, "announcement_id": ann_id, "message": "Announcement posted successfully"})
                return

            # POST /api/admin/telegram/config
            if path == '/api/admin/telegram/config':
                bot_token = data.get('bot_token', '').strip()
                chat_id = data.get('chat_id', '').strip()
                auto_post = 'true' if data.get('auto_post', True) else 'false'
                hashtag = data.get('hashtag', '#DarFest2026').strip()

                if bot_token:
                    cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('telegram_bot_token', bot_token))
                if chat_id:
                    cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('telegram_chat_id', chat_id))
                cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('telegram_auto_post', auto_post))
                cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('telegram_hashtag', hashtag))
                conn.commit()

                self.send_json({"success": True, "message": "Telegram configuration saved successfully"})
                return

            # POST /api/admin/telegram/test
            if path == '/api/admin/telegram/test':
                bot_token = data.get('bot_token') or self.get_setting('telegram_bot_token', '')
                chat_id = data.get('chat_id') or self.get_setting('telegram_chat_id', '')

                if not bot_token:
                    self.send_error_json("Please provide a Telegram Bot Token first", 400)
                    return

                res = TelegramService.test_connection(bot_token, chat_id)
                self.send_json(res)
                return

            # POST /api/admin/settings
            if path == '/api/admin/settings':
                for k, v in data.items():
                    cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (k, str(v)))
                conn.commit()
                self.send_json({"success": True, "message": "Fest settings updated successfully"})
                return

            self.send_error_json("Endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ PUT REQUESTS ------------------
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not self.is_admin():
            self.send_error_json("Unauthorized: Admin credentials required", 401)
            return

        data = self.parse_body()
        conn = get_db()
        cursor = conn.cursor()

        try:
            # PUT /api/admin/students/<id>
            match_student = re.match(r'^/api/admin/students/(\d+)$', path)
            if match_student:
                st_id = int(match_student.group(1))
                chest_no = str(data.get('chest_no', '')).strip()
                name = data.get('name', '').strip()
                house_id = data.get('house_id')
                category_id = data.get('category_id')

                cursor.execute('''
                    UPDATE students 
                    SET chest_no = ?, name = ?, house_id = ?, category_id = ?
                    WHERE id = ?
                ''', (chest_no, name, house_id, category_id, st_id))
                conn.commit()
                self.send_json({"success": True, "message": "Student updated successfully"})
                return

            # PUT /api/admin/programmes/<id>
            match_prog = re.match(r'^/api/admin/programmes/(\d+)$', path)
            if match_prog:
                prog_id = int(match_prog.group(1))
                code = str(data.get('code', '')).strip()
                name = data.get('name', '').strip()
                category_id = data.get('category_id')
                prog_type = data.get('type', 'On-Stage')
                stage_name = data.get('stage_name', 'Stage 1')
                scheduled_time = data.get('scheduled_time', '')
                status = data.get('status', 'Upcoming')

                cursor.execute('''
                    UPDATE programmes
                    SET code = ?, name = ?, category_id = ?, type = ?, stage_name = ?, scheduled_time = ?, status = ?
                    WHERE id = ?
                ''', (code, name, category_id, prog_type, stage_name, scheduled_time, status, prog_id))
                conn.commit()
                self.send_json({"success": True, "message": "Programme updated successfully"})
                return

            self.send_error_json("Endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ DELETE REQUESTS ------------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not self.is_admin():
            self.send_error_json("Unauthorized: Admin credentials required", 401)
            return

        conn = get_db()
        cursor = conn.cursor()

        try:
            # DELETE /api/admin/students/<id>
            match_student = re.match(r'^/api/admin/students/(\d+)$', path)
            if match_student:
                st_id = int(match_student.group(1))
                cursor.execute('DELETE FROM students WHERE id = ?', (st_id,))
                conn.commit()
                self.send_json({"success": True, "message": "Student deleted successfully"})
                return

            # DELETE /api/admin/programmes/<id>
            match_prog = re.match(r'^/api/admin/programmes/(\d+)$', path)
            if match_prog:
                prog_id = int(match_prog.group(1))
                cursor.execute('DELETE FROM programmes WHERE id = ?', (prog_id,))
                conn.commit()
                recalculate_house_points_conn(conn)
                self.send_json({"success": True, "message": "Programme deleted successfully"})
                return

            # DELETE /api/admin/results/<id>
            match_res = re.match(r'^/api/admin/results/(\d+)$', path)
            if match_res:
                res_id = int(match_res.group(1))
                cursor.execute('SELECT programme_id FROM results WHERE id = ?', (res_id,))
                r_row = cursor.fetchone()
                if r_row:
                    cursor.execute("UPDATE programmes SET status = 'Completed' WHERE id = ?", (r_row['programme_id'],))
                cursor.execute('DELETE FROM result_winners WHERE result_id = ?', (res_id,))
                cursor.execute('DELETE FROM results WHERE id = ?', (res_id,))
                conn.commit()
                recalculate_house_points_conn(conn)
                self.send_json({"success": True, "message": "Result deleted successfully"})
                return

            # DELETE /api/admin/announcements/<id>
            # DELETE /api/admin/houses/<id>
            match_house = re.match(r'^/api/admin/houses/(\d+)$', path)
            if match_house:
                house_id = int(match_house.group(1))
                cursor.execute('DELETE FROM houses WHERE id = ?', (house_id,))
                conn.commit()
                self.send_json({"success": True, "message": "House deleted successfully"})
                return

            match_ann = re.match(r'^/api/admin/announcements/(\d+)$', path)
            if match_ann:
                ann_id = int(match_ann.group(1))
                cursor.execute('DELETE FROM announcements WHERE id = ?', (ann_id,))
                conn.commit()
                self.send_json({"success": True, "message": "Announcement deleted successfully"})
                return

            self.send_error_json("Endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ MULTIPART FILE UPLOAD ------------------
    def handle_file_upload(self):
        content_type = self.headers.get('Content-Type', '')
        if not content_type.startswith('multipart/form-data'):
            self.send_error_json("Content-Type must be multipart/form-data", 400)
            return

        boundary = content_type.split("boundary=")[-1].strip()
        content_len = int(self.headers.get('Content-Length', 0))
        raw_data = self.rfile.read(content_len)

        boundary_bytes = ("--" + boundary).encode('utf-8')
        parts = raw_data.split(boundary_bytes)

        saved_files = []
        for part in parts:
            if b'filename="' in part:
                headers_part, file_body = part.split(b'\r\n\r\n', 1)
                file_body = file_body.rstrip(b'\r\n--')
                
                fn_match = re.search(r'filename="([^"]+)"', headers_part.decode('utf-8', errors='ignore'))
                orig_filename = fn_match.group(1) if fn_match else "upload.jpg"
                ext = os.path.splitext(orig_filename)[1] or '.jpg'
                
                safe_name = f"fest_{uuid.uuid4().hex[:10]}{ext}"
                target_path = os.path.join(UPLOADS_DIR, safe_name)
                
                with open(target_path, 'wb') as f:
                    f.write(file_body)
                
                saved_files.append(f"/uploads/{safe_name}")

        if saved_files:
            self.send_json({
                "success": True,
                "url": saved_files[0],
                "urls": saved_files,
                "message": "File uploaded successfully"
            })
        else:
            self.send_error_json("No valid file found in request", 400)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run_server(port=PORT, host=HOST):
    init_db()
    server_address = (host, port)
    httpd = ThreadedHTTPServer(server_address, ArtFestHandler)
    print(f"🎉 DARFEST 2026 Server running at http://{host}:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
