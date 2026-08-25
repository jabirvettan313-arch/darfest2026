                cursor.execute('''
                    SELECT c.id as category_id, c.name as category_name,
                           s.id as student_id, s.chest_no, s.name as student_name, s.photo_url, h.name as house_name, h.color as house_color,
                           SUM(rw.points_awarded) as total_points,
                           COUNT(rw.id) as prize_count
                    FROM categories c
                    JOIN programmes p ON c.id = p.category_id
                    JOIN results r ON p.id = r.programme_id
                    JOIN result_winners rw ON r.id = rw.result_id
                    JOIN students s ON (rw.chest_no = s.chest_no OR rw.student_id = s.id)
                    LEFT JOIN houses h ON s.house_id = h.id
                    WHERE r.published = 1
                    GROUP BY c.id, s.id
                    ORDER BY c.id ASC, total_points DESC, prize_count DESC
                ''')
                stu_cat_rows = cursor.fetchall()
                student_category_champions = {}
                for row in stu_cat_rows:
                    cid = row['category_id']
                    if cid not in student_category_champions:
                        student_category_champions[cid] = dict(row)
