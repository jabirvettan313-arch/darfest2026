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
                        INSERT INTO houses (name, code, color, badge_color, bg_gradient, icon)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (name, code, color, badge_color, bg_gradient, 'shield'))
                
                conn.commit()
                self.send_json({"success": True, "message": "House saved successfully"})
                return

            # DELETE /api/admin/houses/<id>
            match_house = re.match(r'^/api/admin/houses/(\d+)$', path)
            if match_house:
                house_id = int(match_house.group(1))
                cursor.execute('DELETE FROM houses WHERE id = ?', (house_id,))
                conn.commit()
                self.send_json({"success": True, "message": "House deleted successfully"})
                return

