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
