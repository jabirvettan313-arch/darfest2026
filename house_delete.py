            # DELETE /api/admin/houses/<id>
            match_house = re.match(r'^/api/admin/houses/(\d+)$', path)
            if match_house:
                house_id = int(match_house.group(1))
                cursor.execute('DELETE FROM houses WHERE id = ?', (house_id,))
                conn.commit()
                self.send_json({"success": True, "message": "House deleted successfully"})
                return

