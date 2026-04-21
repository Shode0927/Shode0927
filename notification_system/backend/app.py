"""
スマホ通知一括管理システム - バックエンドサーバー
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
from functools import wraps

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
DB_PATH = os.path.join(BASE_DIR, 'notifications.db')

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'))
app.config['SECRET_KEY'] = 'notification-system-secret-key'
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS notifications (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                body        TEXT,
                app_name    TEXT    NOT NULL DEFAULT 'Unknown',
                category    TEXT    NOT NULL DEFAULT 'other',
                priority    TEXT    NOT NULL DEFAULT 'normal'
                                    CHECK(priority IN ('low','normal','high','urgent')),
                is_read     INTEGER NOT NULL DEFAULT 0,
                is_starred  INTEGER NOT NULL DEFAULT 0,
                is_archived INTEGER NOT NULL DEFAULT 0,
                received_at TEXT    NOT NULL,
                metadata    TEXT    DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS rules (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                condition   TEXT NOT NULL,
                action      TEXT NOT NULL,
                is_active   INTEGER NOT NULL DEFAULT 1,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        _seed_demo_notifications(conn)


def _seed_demo_notifications(conn):
    count = conn.execute("SELECT COUNT(*) FROM notifications").fetchone()[0]
    if count > 0:
        return

    demos = [
        ("LINE", "田中さん", "明日の件、大丈夫ですか？", "message", "normal"),
        ("Gmail", "Google", "新しいセキュリティ通知があります", "email", "high"),
        ("Twitter/X", "フォロワー", "あなたのツイートにいいねしました", "sns", "low"),
        ("YouTube", "チャンネル更新", "新しい動画がアップされました", "media", "low"),
        ("銀行アプリ", "三菱UFJ銀行", "お支払いが完了しました: ¥3,500", "finance", "high"),
        ("カレンダー", "リマインダー", "15分後に会議が始まります", "reminder", "urgent"),
        ("Instagram", "友達", "あなたの投稿にコメントしました", "sns", "normal"),
        ("ニュース", "Yahoo!ニュース", "速報: 本日の主要ニュース", "news", "normal"),
        ("メッセージ", "佐藤さん", "了解しました！", "message", "normal"),
        ("App Store", "アップデート", "3件のアップデートが利用可能です", "system", "low"),
        ("Slack", "開発チーム", "デプロイが完了しました ✅", "work", "high"),
        ("Amazon", "注文確認", "ご注文が発送されました", "shopping", "normal"),
    ]

    now = datetime.now()
    for i, (app_name, title, body, category, priority) in enumerate(demos):
        minutes_ago = (len(demos) - i) * 15
        ts = now.replace(
            minute=(now.minute - minutes_ago % 60) % 60,
            hour=(now.hour - minutes_ago // 60) % 24,
        ).isoformat()
        conn.execute(
            "INSERT INTO notifications (title, body, app_name, category, priority, received_at) VALUES (?,?,?,?,?,?)",
            (title, body, app_name, category, priority, ts),
        )
    conn.commit()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def row_to_dict(row):
    d = dict(row)
    d['is_read'] = bool(d['is_read'])
    d['is_starred'] = bool(d['is_starred'])
    d['is_archived'] = bool(d['is_archived'])
    if isinstance(d.get('metadata'), str):
        try:
            d['metadata'] = json.loads(d['metadata'])
        except Exception:
            d['metadata'] = {}
    return d


def paginate(query_rows, page, per_page):
    total = len(query_rows)
    start = (page - 1) * per_page
    return query_rows[start:start + per_page], total


# ─── API Routes ───────────────────────────────────────────────────────────────

@app.route('/api/notifications', methods=['GET'])
def list_notifications():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    category = request.args.get('category')
    priority = request.args.get('priority')
    is_read = request.args.get('is_read')
    is_starred = request.args.get('is_starred')
    is_archived = request.args.get('is_archived', '0')
    search = request.args.get('search', '').strip()

    sql = "SELECT * FROM notifications WHERE 1=1"
    params = []

    sql += " AND is_archived = ?"
    params.append(1 if is_archived == '1' else 0)

    if category and category != 'all':
        sql += " AND category = ?"
        params.append(category)
    if priority and priority != 'all':
        sql += " AND priority = ?"
        params.append(priority)
    if is_read is not None:
        sql += " AND is_read = ?"
        params.append(1 if is_read == '1' else 0)
    if is_starred == '1':
        sql += " AND is_starred = 1"
    if search:
        sql += " AND (title LIKE ? OR body LIKE ? OR app_name LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like, like])

    sql += " ORDER BY received_at DESC"

    with get_db() as conn:
        rows = [row_to_dict(r) for r in conn.execute(sql, params).fetchall()]

    items, total = paginate(rows, page, per_page)
    return jsonify({
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': max(1, (total + per_page - 1) // per_page),
    })


@app.route('/api/notifications', methods=['POST'])
def create_notification():
    data = request.get_json(force=True)
    required = ('title', 'app_name')
    if not all(data.get(k) for k in required):
        return jsonify({'error': 'title と app_name は必須です'}), 400

    now = datetime.now().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO notifications
               (title, body, app_name, category, priority, received_at, metadata)
               VALUES (?,?,?,?,?,?,?)""",
            (
                data['title'],
                data.get('body', ''),
                data['app_name'],
                data.get('category', 'other'),
                data.get('priority', 'normal'),
                data.get('received_at', now),
                json.dumps(data.get('metadata', {})),
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (new_id,)).fetchone()

    notification = row_to_dict(row)
    socketio.emit('new_notification', notification)
    return jsonify(notification), 201


@app.route('/api/notifications/<int:nid>', methods=['GET'])
def get_notification(nid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    if not row:
        return jsonify({'error': '通知が見つかりません'}), 404
    return jsonify(row_to_dict(row))


@app.route('/api/notifications/<int:nid>', methods=['PATCH'])
def update_notification(nid):
    data = request.get_json(force=True)
    allowed = ('is_read', 'is_starred', 'is_archived', 'priority')
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({'error': '更新可能なフィールドがありません'}), 400

    set_clause = ', '.join(f"{k}=?" for k in updates)
    with get_db() as conn:
        conn.execute(
            f"UPDATE notifications SET {set_clause} WHERE id=?",
            (*updates.values(), nid),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    if not row:
        return jsonify({'error': '通知が見つかりません'}), 404

    notification = row_to_dict(row)
    socketio.emit('notification_updated', notification)
    return jsonify(notification)


@app.route('/api/notifications/<int:nid>', methods=['DELETE'])
def delete_notification(nid):
    with get_db() as conn:
        conn.execute("DELETE FROM notifications WHERE id=?", (nid,))
        conn.commit()
    socketio.emit('notification_deleted', {'id': nid})
    return jsonify({'message': '削除しました', 'id': nid})


@app.route('/api/notifications/bulk', methods=['PATCH'])
def bulk_update():
    data = request.get_json(force=True)
    ids = data.get('ids', [])
    action = data.get('action')

    action_map = {
        'read':     'UPDATE notifications SET is_read=1 WHERE id IN',
        'unread':   'UPDATE notifications SET is_read=0 WHERE id IN',
        'archive':  'UPDATE notifications SET is_archived=1 WHERE id IN',
        'unarchive':'UPDATE notifications SET is_archived=0 WHERE id IN',
        'star':     'UPDATE notifications SET is_starred=1 WHERE id IN',
        'unstar':   'UPDATE notifications SET is_starred=0 WHERE id IN',
        'delete':   'DELETE FROM notifications WHERE id IN',
    }
    if action not in action_map or not ids:
        return jsonify({'error': '無効なリクエストです'}), 400

    placeholders = ','.join('?' * len(ids))
    with get_db() as conn:
        conn.execute(f"{action_map[action]} ({placeholders})", ids)
        conn.commit()

    socketio.emit('bulk_updated', {'ids': ids, 'action': action})
    return jsonify({'message': f'{len(ids)}件を更新しました', 'ids': ids, 'action': action})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    with get_db() as conn:
        total       = conn.execute("SELECT COUNT(*) FROM notifications WHERE is_archived=0").fetchone()[0]
        unread      = conn.execute("SELECT COUNT(*) FROM notifications WHERE is_read=0 AND is_archived=0").fetchone()[0]
        starred     = conn.execute("SELECT COUNT(*) FROM notifications WHERE is_starred=1 AND is_archived=0").fetchone()[0]
        archived    = conn.execute("SELECT COUNT(*) FROM notifications WHERE is_archived=1").fetchone()[0]
        urgent      = conn.execute("SELECT COUNT(*) FROM notifications WHERE priority='urgent' AND is_read=0 AND is_archived=0").fetchone()[0]
        by_category = conn.execute(
            "SELECT category, COUNT(*) as count FROM notifications WHERE is_archived=0 GROUP BY category"
        ).fetchall()
        by_app      = conn.execute(
            "SELECT app_name, COUNT(*) as count FROM notifications WHERE is_archived=0 GROUP BY app_name ORDER BY count DESC LIMIT 5"
        ).fetchall()

    return jsonify({
        'total': total,
        'unread': unread,
        'starred': starred,
        'archived': archived,
        'urgent': urgent,
        'by_category': {r['category']: r['count'] for r in by_category},
        'by_app': [{'app_name': r['app_name'], 'count': r['count']} for r in by_app],
    })


@app.route('/api/rules', methods=['GET'])
def list_rules():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM rules ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/rules', methods=['POST'])
def create_rule():
    data = request.get_json(force=True)
    required = ('name', 'condition', 'action')
    if not all(data.get(k) for k in required):
        return jsonify({'error': 'name, condition, action は必須です'}), 400

    now = datetime.now().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO rules (name, condition, action, created_at) VALUES (?,?,?,?)",
            (data['name'], json.dumps(data['condition']), json.dumps(data['action']), now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM rules WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.route('/api/rules/<int:rid>', methods=['DELETE'])
def delete_rule(rid):
    with get_db() as conn:
        conn.execute("DELETE FROM rules WHERE id=?", (rid,))
        conn.commit()
    return jsonify({'message': '削除しました', 'id': rid})


# ─── Frontend Serving ─────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_DIR, 'static', path)):
        return send_from_directory(os.path.join(FRONTEND_DIR, 'static'), path)
    return send_from_directory(os.path.join(FRONTEND_DIR, 'templates'), 'index.html')


# ─── WebSocket Events ─────────────────────────────────────────────────────────

@socketio.on('connect')
def on_connect():
    emit('connected', {'message': '接続しました'})


@socketio.on('ping_server')
def on_ping(data):
    emit('pong_server', {'timestamp': datetime.now().isoformat()})


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    print("🔔 通知管理サーバーを起動しています... http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
