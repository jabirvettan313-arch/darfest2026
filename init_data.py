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

