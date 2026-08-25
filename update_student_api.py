            # PUT /api/admin/students/<id>
            match_student = re.match(r'^/api/admin/students/(\d+)$', path)
            if match_student:
                st_id = int(match_student.group(1))
                chest_no = str(data.get('chest_no', '')).strip()
                name = data.get('name', '').strip()
                house_id = data.get('house_id')
                category_id = data.get('category_id')
                photo_url = data.get('photo_url', '')

                cursor.execute('''
                    UPDATE students 
                    SET chest_no = ?, name = ?, house_id = ?, category_id = ?, photo_url = ?
                    WHERE id = ?
                ''', (chest_no, name, house_id, category_id, photo_url, st_id))
                conn.commit()
                self.send_json({"success": True, "message": "Student updated successfully"})
                return
