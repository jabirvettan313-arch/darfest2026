# 🎨 ArtFest Pro — Live Results & Fest Management Platform

A high-performance Arts & Cultural Festival Result Publishing and Management Web Application with a modern Glassmorphism UI, Olympic Podium Leaderboard, Student/Programme CRUD, live ticker, and automated **Telegram Channel Bot Integration** for instant result and photo broadcasts.

---

## 🌟 Key Features

### 1. 🌐 Public Festival Portal
- **Championship Leaderboard**: Live Olympic-style 3D podium for top 3 houses (Ruby, Sapphire, Emerald, Topaz) with automated score counters, medal tallies (Gold, Silver, Bronze), and category breakdowns.
- **Published Results Board**: Complete list of declared results with 1st, 2nd, and 3rd place winners, grades (A, B, C), awarded points, house badges, and candid photo previews.
- **1-Click Shareable Result Poster (PNG)**: Built-in HTML5 Canvas poster generator that creates social-media ready high-resolution certificates/graphics for WhatsApp and Instagram.
- **Stage Timetable & Schedule**: Stage-by-stage program lineup with live status indicators (*"🔴 LIVE NOW"*, *"⏳ UPCOMING"*, *"✅ COMPLETED"*, *"🏆 RESULTS OUT"*).
- **Participant & Chest Number Finder**: Instant search by Chest Number (e.g. `101`) or Student Name to view full event registrations and won prizes.
- **Live Breaking Ticker**: Real-time marquee banner for urgent calls and breaking results.

### 2. 🔒 Hidden Admin Management Console (`/#/admin`)
- **Protected Access**: PIN / Password protected authentication (**Default PIN: `1234`**).
- **Student Management (CRUD)**:
  - Add, Edit, Delete students with Chest Number, Name, House, Category, and Phone.
  - Bulk CSV / Tab-separated text import.
- **Programme Management (CRUD)**:
  - Add, Edit, Delete events with custom codes, venues, stages, time slots, and point weights.
- **Result Studio & Auto Score Engine**:
  - Select an event, type Chest Numbers to auto-fill candidate names and houses, pick positions (1st, 2nd, 3rd), assign grades (A, B, C) and points.
  - Upload candid result/trophy photos.
  - 1-click **Publish**: automatically recalculates all house standings and broadcasts formatted text + photo to your Telegram channel!
- **Live Announcements**:
  - Post breaking notices, schedule updates, or urgent alerts directly to the web ticker and Telegram.
- **Telegram Bot Hub**:
  - Configure Bot Token (from `@BotFather`) and Channel ID (`@your_channel` or chat ID).
  - Built-in "Test Telegram Ping" diagnostic tool.
  - Manual custom text/photo broadcast dispatcher.
- **Festival Settings**:
  - Update festival title, year, tagline, change Admin PIN, or reset to default demo dataset.

---

## 🚀 Quick Start Guide

### How to Run:
Run the startup script in terminal:
```bash
./start.sh
```
Or directly using Python 3:
```bash
./bin/python3 backend/server.py
```

### Access URLs:
- **Public Portal**: [http://localhost:8080/](http://localhost:8080/)
- **Hidden Admin Page**: [http://localhost:8080/#/admin](http://localhost:8080/#/admin)
- **Default Admin PIN**: `1234`

---

## 🤖 Telegram Bot Configuration

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to create your festival bot and receive your **API Token**.
3. Create your public or private Telegram Channel/Group and add your newly created bot as an **Administrator** with permission to post messages.
4. In the ArtFest Admin Console:
   - Go to **Telegram Bot** tab.
   - Enter your **Bot Token** and **Channel Username** (e.g. `@kalotsav_channel`).
   - Click **Test Telegram Ping** to confirm connection.
5. All future published results and announcements will now automatically broadcast to your Telegram channel!

---

## 📁 Directory Structure

```
art-fest/
├── backend/
│   ├── database.py              # SQLite schema, migrations, seed data & point engine
│   ├── server.py                # Multi-threaded HTTP server & REST APIs
│   ├── services/
│   │   └── telegram_service.py   # Telegram Bot API integration (HTML text & photo dispatch)
│   ├── uploads/                 # Storage for photos, posters & certificates
│   └── artfest.db               # SQLite database
├── frontend/
│   ├── index.html               # Main Single-Page App shell with glassmorphism layout
│   ├── app.js                   # Client controller, live scoreboards, and poster canvas
│   └── styles.css               # Custom animations, glassmorphism, and responsive styling
├── start.sh                     # One-click launch script
└── README.md                    # Documentation
```
