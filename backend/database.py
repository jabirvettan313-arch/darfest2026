import sqlite3
import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')

def load_env():
    """Loads environment variables from .env file into os.environ."""
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

DB_PATH = os.environ.get('DB_PATH')
if not DB_PATH:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'artfest.db')
elif not os.path.isabs(DB_PATH):
    DB_PATH = os.path.join(BASE_DIR, DB_PATH)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # Houses / Teams table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS houses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL,
            badge_color TEXT NOT NULL,
            bg_gradient TEXT NOT NULL,
            icon TEXT DEFAULT 'award',
            points INTEGER DEFAULT 0
        )
    ''')

    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            order_num INTEGER DEFAULT 0
        )
    ''')

    # Programmes / Events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS programmes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category_id INTEGER,
            type TEXT DEFAULT 'On-Stage',
            format TEXT DEFAULT 'Solo',
            stage_name TEXT DEFAULT 'Main Stage',
            scheduled_date TEXT,
            scheduled_time TEXT,
            status TEXT DEFAULT 'Upcoming',
            first_points INTEGER DEFAULT 5,
            second_points INTEGER DEFAULT 3,
            third_points INTEGER DEFAULT 1,
            grade_a_points INTEGER DEFAULT 5,
            grade_b_points INTEGER DEFAULT 3,
            grade_c_points INTEGER DEFAULT 1,
            banner_url TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    ''')

    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chest_no TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            house_id INTEGER,
            category_id INTEGER,
            phone TEXT,
            photo_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (house_id) REFERENCES houses(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    ''')

    # Student to Programme Registrations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_programmes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            programme_id INTEGER NOT NULL,
            UNIQUE(student_id, programme_id),
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE
        )
    ''')

    # Results Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            programme_id INTEGER UNIQUE NOT NULL,
            published INTEGER DEFAULT 1,
            published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            photo_url TEXT,
            notes TEXT,
            telegram_sent INTEGER DEFAULT 0,
            FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE
        )
    ''')

    # Result Winners Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS result_winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            result_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            student_id INTEGER,
            chest_no TEXT NOT NULL,
            student_name TEXT NOT NULL,
            house_id INTEGER NOT NULL,
            grade TEXT DEFAULT 'None',
            points_awarded INTEGER DEFAULT 0,
            FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
            FOREIGN KEY (house_id) REFERENCES houses(id)
        )
    ''')

    # Announcements / Live Ticker Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            show_ticker INTEGER DEFAULT 1,
            sent_telegram INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()

    # Sync .env values into settings table
    sync_env_to_settings(cursor, conn)

    # Check if database is empty, then seed defaults
    cursor.execute('SELECT COUNT(*) FROM houses')
    if cursor.fetchone()[0] == 0:
        seed_default_data(cursor, conn)

    conn.close()

def sync_env_to_settings(cursor, conn):
    """Syncs environment variables into the settings table."""
    env_mappings = {
        'fest_name': os.environ.get('FEST_NAME', 'MUBARAZA'),
        'fest_tagline': os.environ.get('FEST_TAGLINE', "Dars Fest '26"),
        'fest_date': os.environ.get('FEST_DATE', 'August 25 - 28, 2026'),
        'admin_pin': os.environ.get('ADMIN_PIN', '321'),
        'admin_pass': os.environ.get('ADMIN_PASSWORD', 'jabirv 321'),
        'telegram_bot_token': os.environ.get('TELEGRAM_BOT_TOKEN', '8582305977:AAH1JLYb0uzelhnU8JQRhXI6DCfNb8mFhdk'),
        'telegram_chat_id': os.environ.get('TELEGRAM_CHAT_ID', ''),
        'telegram_auto_post': os.environ.get('TELEGRAM_AUTO_POST', 'true'),
        'telegram_hashtag': os.environ.get('TELEGRAM_HASHTAG', '#DarFest2026 #ArtFestResults'),
    }
    for k, v in env_mappings.items():
        if v:
            cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (k, str(v)))
    conn.commit()

def seed_default_data(cursor, conn):
    # Default Houses
    houses = [
        ('Ruby Royals', 'RUBY', '#ef4444', 'bg-red-500', 'from-red-500 to-rose-600', 'gem'),
        ('Emerald Eagles', 'EMERALD', '#10b981', 'bg-emerald-500', 'from-emerald-500 to-teal-600', 'sparkles')
    ]
    for h in houses:
        cursor.execute('''
            INSERT INTO houses (name, code, color, badge_color, bg_gradient, icon, points)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        ''', h)

    # Default Categories
    categories = [
        ('Sub-Junior', 'SUB_JR', 1),
        ('Junior', 'JR', 2),
        ('Senior', 'SR', 3),
        ('General', 'GEN', 4)
    ]
    for c in categories:
        cursor.execute('INSERT INTO categories (name, code, order_num) VALUES (?, ?, ?)', c)

    # Seed Some Initial Programmes
    programmes = [
        ('PRG-101', 'Classical Music Vocal', 3, 'On-Stage', 'Solo', 'Stage 1 (Kalanikethan)', '2026-08-25', '10:00 AM', 'Results Declared', 5, 3, 1, 5, 3, 1),
        ('PRG-102', 'Bharatanatyam', 3, 'On-Stage', 'Solo', 'Stage 1 (Kalanikethan)', '2026-08-25', '11:30 AM', 'Results Declared', 5, 3, 1, 5, 3, 1),
        ('PRG-103', 'Mime', 4, 'On-Stage', 'Group', 'Stage 2 (Chitralekha)', '2026-08-25', '02:00 PM', 'Ongoing', 10, 6, 2, 5, 3, 1),
        ('PRG-104', 'Water Colour Painting', 2, 'Off-Stage', 'Solo', 'Hall A (Art Wing)', '2026-08-25', '09:30 AM', 'Results Declared', 5, 3, 1, 5, 3, 1),
        ('PRG-105', 'Pencil Drawing', 1, 'Off-Stage', 'Solo', 'Hall B (Design Lab)', '2026-08-25', '11:00 AM', 'Completed', 5, 3, 1, 5, 3, 1),
        ('PRG-106', 'Oppana', 3, 'On-Stage', 'Group', 'Main Auditorium', '2026-08-25', '04:30 PM', 'Upcoming', 10, 6, 2, 5, 3, 1),
        ('PRG-107', 'English Elocution', 3, 'On-Stage', 'Solo', 'Seminar Hall 1', '2026-08-25', '01:30 PM', 'Results Declared', 5, 3, 1, 5, 3, 1),
        ('PRG-108', 'Duffmuttu', 4, 'On-Stage', 'Group', 'Open Stage', '2026-08-25', '06:00 PM', 'Upcoming', 10, 6, 2, 5, 3, 1)
    ]
    for p in programmes:
        cursor.execute('''
            INSERT INTO programmes (code, name, category_id, type, format, stage_name, scheduled_date, scheduled_time, status, first_points, second_points, third_points, grade_a_points, grade_b_points, grade_c_points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', p)

    # Seed Sample Students
    # Seed Sample Students
    students = [
        ('101', 'Shammas P', 1, 2, ''),
        ('102', 'Sinan M', 3, 2, ''),
        ('103', 'Adnan', 1, 2, ''),
        ('104', 'Nasib', 3, 2, ''),
        ('105', 'Hadi', 1, 2, ''),
        ('106', 'Razan', 3, 2, ''),
        ('201', 'Shammas T', 1, 3, ''),
        ('202', 'Sehal', 3, 3, ''),
        ('203', 'Nasif', 1, 3, ''),
        ('204', 'Hamis', 3, 3, ''),
        ('205', 'Ziyan', 1, 3, '')
    ]
    for s in students:
        cursor.execute('''
            INSERT INTO students (chest_no, name, house_id, category_id, phone)
            VALUES (?, ?, ?, ?, ?)
        ''', s)

    conn.commit()
