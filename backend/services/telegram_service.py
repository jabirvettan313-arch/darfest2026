import urllib.request
import urllib.parse
import json
import os
import mimetypes
import uuid
import ssl

def get_ssl_context():
    try:
        return ssl.create_default_context()
    except Exception:
        return ssl._create_unverified_context()

SSL_CONTEXT = ssl._create_unverified_context()

class TelegramService:
    @staticmethod
    def send_message(bot_token, chat_id, text, parse_mode='HTML'):
        """Sends a text message to a Telegram chat/channel using Telegram Bot API."""
        if not bot_token or not chat_id:
            return {"success": False, "error": "Bot token or Chat ID is missing"}

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": False
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=10) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return {"success": res_data.get("ok", False), "data": res_data}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_photo(bot_token, chat_id, photo_path_or_url, caption="", parse_mode='HTML'):
        """Sends a photo with caption to Telegram chat/channel."""
        if not bot_token or not chat_id:
            return {"success": False, "error": "Bot token or Chat ID is missing"}

        # If it's a web URL
        if photo_path_or_url.startswith('http://') or photo_path_or_url.startswith('https://'):
            url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
            payload = {
                "chat_id": chat_id,
                "photo": photo_path_or_url,
                "caption": caption,
                "parse_mode": parse_mode
            }
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=15) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    return {"success": res_data.get("ok", False), "data": res_data}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # If it's a local file on server
        if not os.path.exists(photo_path_or_url):
            # Fallback to text message if photo doesn't exist
            return TelegramService.send_message(bot_token, chat_id, caption, parse_mode)

        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        filename = os.path.basename(photo_path_or_url)
        mime_type = mimetypes.guess_type(photo_path_or_url)[0] or 'application/octet-stream'

        with open(photo_path_or_url, 'rb') as f:
            file_bytes = f.read()

        body_parts = []
        
        # chat_id part
        body_parts.append(f"--{boundary}\r\n".encode('utf-8'))
        body_parts.append(f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{chat_id}\r\n'.encode('utf-8'))
        
        # caption part
        if caption:
            body_parts.append(f"--{boundary}\r\n".encode('utf-8'))
            body_parts.append(f'Content-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'.encode('utf-8'))
            
            body_parts.append(f"--{boundary}\r\n".encode('utf-8'))
            body_parts.append(f'Content-Disposition: form-data; name="parse_mode"\r\n\r\n{parse_mode}\r\n'.encode('utf-8'))

        # photo part
        body_parts.append(f"--{boundary}\r\n".encode('utf-8'))
        body_parts.append(f'Content-Disposition: form-data; name="photo"; filename="{filename}"\r\n'.encode('utf-8'))
        body_parts.append(f'Content-Type: {mime_type}\r\n\r\n'.encode('utf-8'))
        body_parts.append(file_bytes)
        body_parts.append(f"\r\n--{boundary}--\r\n".encode('utf-8'))

        full_body = b''.join(body_parts)
        url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"

        try:
            req = urllib.request.Request(
                url,
                data=full_body,
                headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
            )
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=20) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return {"success": res_data.get("ok", False), "data": res_data}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def test_connection(bot_token, chat_id):
        """Validates bot token and optionally tests chat delivery."""
        if not bot_token:
            return {"success": False, "error": "Bot token is required"}
        
        # Test bot identity
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=10) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                if not res_data.get("ok"):
                    return {"success": False, "error": "Invalid Telegram Bot Token"}
                
                bot_info = res_data.get("result", {})

                # If chat_id is provided, send a quick ping
                chat_ping = None
                if chat_id:
                    ping_text = f"✨ <b>ArtFest Telegram Bot Connected!</b>\n\nConnected successfully to <b>@{bot_info.get('username', 'Bot')}</b>.\nReady to broadcast live results and announcements."
                    chat_ping = TelegramService.send_message(bot_token, chat_id, ping_text)

                return {
                    "success": True,
                    "bot_name": bot_info.get("first_name"),
                    "bot_username": bot_info.get("username"),
                    "chat_test": chat_ping
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def format_result_message(fest_name, programme, winners, hashtag="#DarFest2026"):
        """Formats an attractive Telegram post for a declared result."""
        prog_name = programme.get("name", "Event")
        prog_code = programme.get("code", "")
        category = programme.get("category_name", "")
        prog_type = programme.get("type", "On-Stage")
        stage = programme.get("stage_name", "")

        medals = {1: "🥇 <b>1st Place</b>", 2: "🥈 <b>2nd Place</b>", 3: "🥉 <b>3rd Place</b>", 0: "🎖️ <b>Consolation</b>"}

        msg_lines = [
            f"🏆 <b>{fest_name} — RESULT DECLARED!</b> 🏆",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"🎭 <b>{prog_name}</b> ({prog_code})",
            f"📂 <b>Category:</b> {category} | <b>Type:</b> {prog_type}",
        ]
        if stage:
            msg_lines.append(f"📍 <b>Venue:</b> {stage}")
        
        msg_lines.append(f"━━━━━━━━━━━━━━━━━━━━\n<b>WINNERS:</b>\n")

        for w in winners:
            pos = w.get("position", 1)
            pos_label = medals.get(pos, f"🏅 <b>Position {pos}</b>")
            name = w.get("student_name", "Student")
            chest_no = w.get("chest_no", "-")
            house_name = w.get("house_name", "House")
            grade = w.get("grade", "None")
            points = w.get("points_awarded", 0)

            grade_str = f" | Grade: <b>{grade}</b>" if grade and grade != "None" else ""
            points_str = f" (+{points} pts)" if points else ""

            msg_lines.append(f"{pos_label}: <b>{name}</b> (Chest #{chest_no})")
            msg_lines.append(f"   🏠 House: <b>{house_name}</b>{grade_str}{points_str}\n")

        msg_lines.append(f"━━━━━━━━━━━━━━━━━━━━")
        msg_lines.append(f"🌐 <i>View live scoreboard & full certificates on web portal.</i>")
        if hashtag:
            msg_lines.append(f"\n{hashtag}")

        return "\n".join(msg_lines)

    @staticmethod
    def format_announcement_message(fest_name, announcement, hashtag="#DarFest2026"):
        """Formats breaking announcement for Telegram."""
        title = announcement.get("title", "Announcement")
        content = announcement.get("content", "")
        priority = announcement.get("priority", "normal")

        icon = "📢"
        if priority == "breaking":
            icon = "🚨 <b>BREAKING NEWS</b>"
        elif priority == "urgent":
            icon = "⚠️ <b>URGENT NOTICE</b>"
        elif priority == "schedule":
            icon = "🗓️ <b>SCHEDULE UPDATE</b>"
        else:
            icon = "📢 <b>ANNOUNCEMENT</b>"

        msg_lines = [
            f"{icon} — <b>{fest_name}</b>",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"📌 <b>{title}</b>\n",
            f"{content}\n",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"🌐 <i>Stay tuned for live festival updates!</i>"
        ]
        if hashtag:
            msg_lines.append(f"\n{hashtag}")

        return "\n".join(msg_lines)
