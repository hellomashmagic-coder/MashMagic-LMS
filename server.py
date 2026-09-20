import os
import sys
import json
import uuid
import sqlite3
import hashlib
from urllib.parse import parse_qs, urlparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie
from datetime import datetime, date, timedelta
import calendar
import database

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "dist") if os.path.exists(os.path.join(os.path.dirname(__file__), "dist")) else os.path.join(os.path.dirname(__file__), "public")

def generate_register_no(cursor):
    current_year = datetime.now().year
    prefix = f"MM-{current_year}-"
    cursor.execute("SELECT register_no FROM students WHERE register_no LIKE ?", (f"{prefix}%",))
    rows = cursor.fetchall()
    max_num = 0
    for r in rows:
        reg = r['register_no']
        parts = reg.split('-')
        if len(parts) == 3 and parts[2].isdigit():
            val = int(parts[2])
            if val > max_num:
                max_num = val
    return f"{prefix}{max_num + 1:04d}"

def generate_faculty_code(cursor):
    current_year = datetime.now().year
    prefix = f"FAC-{current_year}-"
    cursor.execute("SELECT faculty_code FROM faculty WHERE faculty_code LIKE ?", (f"{prefix}%",))
    rows = cursor.fetchall()
    max_num = 0
    for r in rows:
        code = r['faculty_code']
        if code:
            parts = code.split('-')
            if len(parts) == 3 and parts[2].isdigit():
                val = int(parts[2])
                if val > max_num:
                    max_num = val
    return f"{prefix}{max_num + 1:04d}"

def parse_time_to_minutes(t_str):
    if not t_str:
        return 0
    t_str = str(t_str).strip().upper()
    if 'AM' in t_str or 'PM' in t_str:
        is_pm = 'PM' in t_str
        t_clean = t_str.replace('AM', '').replace('PM', '').strip()
        parts = t_clean.split(':')
        hh = int(parts[0])
        mm = int(parts[1]) if len(parts) > 1 else 0
        if is_pm and hh < 12:
            hh += 12
        elif not is_pm and hh == 12:
            hh = 0
        return hh * 60 + mm
    else:
        parts = t_str.split(':')
        hh = int(parts[0]) if parts[0].isdigit() else 0
        mm = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        return hh * 60 + mm

class SSCHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def get_cookies(self):
        cookie_header = self.headers.get('Cookie')
        if not cookie_header:
            return {}
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        return {k: v.value for k, v in cookie.items()}

    def get_authenticated_user(self):
        # 1. Check custom X-Session-ID header (for per-tab sessionStorage isolation)
        session_id = self.headers.get('X-Session-ID')
        
        # 2. Fall back to Authorization Bearer header
        if not session_id:
            auth_header = self.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                session_id = auth_header.split('Bearer ')[1].strip()

        # 3. Fall back to Cookie header
        if not session_id:
            cookies = self.get_cookies()
            session_id = cookies.get('session_id')

        if not session_id:
            return None
        
        conn = database.get_db()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT u.* FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_id = ? AND u.status = 'Active'
        ''', (session_id,))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None

    def send_json(self, data, status=200, set_cookie=None):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cookie, X-Session-ID, Authorization')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        if set_cookie:
            self.send_header('Set-Cookie', set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, filepath, mime_type='text/html'):
        if not os.path.exists(filepath):
            self.send_error(404, "File Not Found")
            return
        with open(filepath, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()
        self.wfile.write(content)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cookie, X-Session-ID, Authorization')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def get_query_params(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        return {k: v[0] for k, v in params.items()}

    def get_body_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length)
        return json.loads(raw.decode('utf-8'))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = self.get_query_params()

        # Public static files
        if not path.startswith('/api'):
            if path in ['/sw.js', '/service-worker.js', '/workbox-sw.js']:
                unreg_script = b"self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', () => self.registration.unregister());"
                self.send_response(200)
                self.send_header('Content-Type', 'application/javascript')
                self.send_header('Content-Length', str(len(unreg_script)))
                self.end_headers()
                self.wfile.write(unreg_script)
                return

            req_path = path.lstrip('/')
            file_to_serve = os.path.join(PUBLIC_DIR, req_path)
            if req_path and os.path.exists(file_to_serve) and os.path.isfile(file_to_serve):
                mime = 'text/html'
                if file_to_serve.endswith('.css'): mime = 'text/css'
                elif file_to_serve.endswith('.js'): mime = 'application/javascript'
                elif file_to_serve.endswith('.png'): mime = 'image/png'
                elif file_to_serve.endswith('.jpg') or file_to_serve.endswith('.jpeg'): mime = 'image/jpeg'
                elif file_to_serve.endswith('.json'): mime = 'application/json'
                elif file_to_serve.endswith('.svg'): mime = 'image/svg+xml'
                return self.send_file(file_to_serve, mime)
            else:
                index_path = os.path.join(PUBLIC_DIR, 'index.html')
                return self.send_file(index_path, 'text/html')

        # Authentication check for API endpoints
        if path == '/api/auth/me':
            user = self.get_authenticated_user()
            if user:
                user_data = {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'role': user['role'],
                    'status': user['status']
                }
                return self.send_json({'authenticated': True, 'user': user_data})
            else:
                return self.send_json({'authenticated': False}, 401)

        # Public API: Session Wrap-Up Data (No Login Required)
        if path.startswith('/api/session-wrapup/'):
            tok = path.split('/api/session-wrapup/')[1].strip()
            conn = database.get_db()
            cursor = conn.cursor()
            cursor.execute('''
            SELECT c.*, s.name as student_name, s.grade as student_grade, s.board as student_board,
                   f.name as faculty_name, f.phone as faculty_phone
            FROM classes c
            JOIN students s ON c.student_id = s.id
            JOIN faculty f ON c.faculty_id = f.id
            WHERE c.wrapup_token = ?
            ''', (tok,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return self.send_json({'error': 'Invalid or expired session wrap-up link'}, 404)
            return self.send_json({'success': True, 'session': dict(row)})

        user = self.get_authenticated_user()
        if not user:
            return self.send_json({'error': 'Unauthorized'}, 401)

        conn = database.get_db()
        cursor = conn.cursor()

        try:
            # API: Dashboard (Scoped by Role)
            if path == '/api/dashboard':
                today_str = date.today().isoformat()

                if user['role'] == 'ACADEMIC_HEAD':
                    today_dt = date.today()
                    period = params.get('period', 'this_month')
                    custom_from = params.get('from_date', '')
                    custom_to = params.get('to_date', '')
                    pkg_filter = params.get('pkg_filter', '30_days')

                    # Determine period start and end dates
                    if period == 'last_month':
                        first_of_this_m = today_dt.replace(day=1)
                        end_d = first_of_this_m - timedelta(days=1)
                        start_d = end_d.replace(day=1)
                    elif period == 'this_quarter':
                        q_month = ((today_dt.month - 1) // 3) * 3 + 1
                        start_d = date(today_dt.year, q_month, 1)
                        end_d = date(today_dt.year, q_month + 2, calendar.monthrange(today_dt.year, q_month + 2)[1])
                    elif period == 'last_3_months':
                        start_d = today_dt - timedelta(days=90)
                        end_d = today_dt
                    elif period == 'this_year':
                        start_d = date(today_dt.year, 1, 1)
                        end_d = date(today_dt.year, 12, 31)
                    elif period == 'custom' and custom_from and custom_to:
                        try:
                            start_d = datetime.strptime(custom_from, '%Y-%m-%d').date()
                            end_d = datetime.strptime(custom_to, '%Y-%m-%d').date()
                        except Exception:
                            start_d = today_dt.replace(day=1)
                            end_d = date(today_dt.year, today_dt.month, calendar.monthrange(today_dt.year, today_dt.month)[1])
                    else: # default: this_month
                        start_d = today_dt.replace(day=1)
                        end_d = date(today_dt.year, today_dt.month, calendar.monthrange(today_dt.year, today_dt.month)[1])

                    start_str = start_d.isoformat()
                    end_str = end_d.isoformat()

                    # 1. Top Level Metrics
                    cursor.execute("SELECT COUNT(*) as count FROM students WHERE status='Active'")
                    active_students = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM students WHERE date(created_at) BETWEEN ? AND ?", (start_str, end_str))
                    new_students = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ?", (start_str, end_str))
                    package_ending_count = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND renewal_status='Renewed'", (start_str, end_str))
                    renewed_count = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND renewal_status='Churned'", (start_str, end_str))
                    churned_count = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND (renewal_status='Pending' OR renewal_status IS NULL OR renewal_status='')", (start_str, end_str))
                    pending_renewal_count = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(DISTINCT CASE WHEN original_class_id IS NOT NULL THEN original_class_id ELSE id END) as count FROM classes WHERE date BETWEEN ? AND ? AND status='RESCHEDULED'", (start_str, end_str))
                    rescheduled_count = cursor.fetchone()['count']

                    # Rates
                    if package_ending_count > 0:
                        renewal_rate = f"{round((renewed_count / package_ending_count) * 100, 1)}%"
                        churn_rate = f"{round((churned_count / package_ending_count) * 100, 1)}%"
                    else:
                        renewal_rate = "N/A"
                        churn_rate = "N/A"

                    # Churn Reasons Breakdown
                    cursor.execute('''
                    SELECT COALESCE(churn_reason, 'Reason Not Recorded') as reason, COUNT(*) as count
                    FROM student_packages
                    WHERE end_date BETWEEN ? AND ? AND renewal_status='Churned'
                    GROUP BY reason
                    ''', (start_str, end_str))
                    churn_raw = {r['reason']: r['count'] for r in cursor.fetchall()}
                    std_reasons = ['Price / affordability', 'Academic satisfaction', 'Student discontinued', 'Other', 'Reason Not Recorded']
                    churn_reasons = {r: churn_raw.get(r, 0) for r in std_reasons}

                    # 2. Upcoming Package Endings List
                    if pkg_filter == '7_days':
                        pkg_end_limit = (today_dt + timedelta(days=7)).isoformat()
                    elif pkg_filter == '15_days':
                        pkg_end_limit = (today_dt + timedelta(days=15)).isoformat()
                    elif pkg_filter == 'this_month':
                        pkg_end_limit = date(today_dt.year, today_dt.month, calendar.monthrange(today_dt.year, today_dt.month)[1]).isoformat()
                    else: # 30_days default
                        pkg_end_limit = (today_dt + timedelta(days=30)).isoformat()

                    cursor.execute('''
                    SELECT sp.*, s.name as student_name, s.name as name, s.register_no as student_register_no, s.register_no as register_number, s.parent_name, s.parent_phone, s.grade, u.name as ssc_name
                    FROM student_packages sp
                    JOIN students s ON sp.student_id = s.id
                    LEFT JOIN users u ON s.assigned_ssc_id = u.id
                    WHERE sp.end_date BETWEEN ? AND ?
                    ORDER BY sp.end_date ASC
                    ''', (today_dt.isoformat(), pkg_end_limit))
                    upcoming_package_endings = [dict(r) for r in cursor.fetchall()]

                    # 3. Class Operations Performance
                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ?", (start_str, end_str))
                    scheduled_classes = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND status='Completed' AND wrapup_status='VERIFIED'", (start_str, end_str))
                    conducted_classes = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND status='POSTPONED'", (start_str, end_str))
                    postponed_classes = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND status='CANCELLED'", (start_str, end_str))
                    cancelled_classes = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND (attendance='No Show' OR status='NO SHOW')", (start_str, end_str))
                    no_show_classes = cursor.fetchone()['count']

                    if scheduled_classes > 0:
                        delivery_rate = f"{round((conducted_classes / scheduled_classes) * 100, 1)}%"
                        rescheduling_rate = f"{round((rescheduled_count / scheduled_classes) * 100, 1)}%"
                        postponement_rate = f"{round((postponed_classes / scheduled_classes) * 100, 1)}%"
                        cancellation_rate = f"{round((cancelled_classes / scheduled_classes) * 100, 1)}%"
                        no_show_rate = f"{round((no_show_classes / scheduled_classes) * 100, 1)}%"
                    else:
                        delivery_rate = "N/A"
                        rescheduling_rate = "N/A"
                        postponement_rate = "N/A"
                        cancellation_rate = "N/A"
                        no_show_rate = "N/A"

                    # 4. Attendance Metrics
                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND attendance='Present'", (start_str, end_str))
                    student_present = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND attendance='Absent'", (start_str, end_str))
                    student_absent = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND attendance='Faculty No Show'", (start_str, end_str))
                    faculty_no_show = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND attendance='Partial'", (start_str, end_str))
                    partial_sessions = cursor.fetchone()['count']

                    att_denom = student_present + student_absent
                    if att_denom > 0:
                        student_attendance_rate = f"{round((student_present / att_denom) * 100, 1)}%"
                    else:
                        student_attendance_rate = "N/A"

                    # 5. Session Reporting & Actual Minutes
                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND wrapup_status='SUBMITTED'", (start_str, end_str))
                    wrapups_submitted = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND wrapup_status='PENDING' AND date <= ?", (start_str, end_str, today_dt.isoformat()))
                    wrapups_pending = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND wrapup_status='VERIFIED'", (start_str, end_str))
                    wrapups_verified = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ? AND wrapup_status='CORRECTION_REQUIRED'", (start_str, end_str))
                    wrapups_correction = cursor.fetchone()['count']

                    req_ver = wrapups_submitted + wrapups_verified + wrapups_correction
                    if req_ver > 0:
                        wrapup_verification_rate = f"{round((wrapups_verified / req_ver) * 100, 1)}%"
                    else:
                        wrapup_verification_rate = "N/A"

                    cursor.execute("SELECT SUM(actual_minutes) as total_mins FROM classes WHERE date BETWEEN ? AND ? AND wrapup_status='VERIFIED'", (start_str, end_str))
                    total_verified_minutes = cursor.fetchone()['total_mins'] or 0

                    if wrapups_verified > 0:
                        avg_session_duration = round(total_verified_minutes / wrapups_verified, 1)
                    else:
                        avg_session_duration = "N/A"

                    # 6. Student Success Operations Summary
                    cursor.execute("SELECT COUNT(*) as count FROM followups WHERE status='Pending'")
                    pending_followups = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM rescheduling_requests WHERE status='Pending'")
                    pending_rescheduling = cursor.fetchone()['count']

                    cursor.execute("SELECT COUNT(*) as count FROM assessments WHERE status='Scheduled'")
                    pending_assessments = cursor.fetchone()['count']

                    cursor.execute('''
                    SELECT student_id FROM classes
                    WHERE attendance='Absent' AND date BETWEEN ? AND ?
                    GROUP BY student_id HAVING COUNT(*) >= 2
                    ''', (start_str, end_str))
                    attendance_concerns = len(cursor.fetchall())

                    cursor.execute("SELECT COUNT(*) as count FROM feedback WHERE rating_status IN ('Concern', 'Needs Attention')")
                    academic_concerns = cursor.fetchone()['count']

                    # 7. SSC Performance Overview Table
                    cursor.execute('''
                    SELECT u.id, u.name as ssc_name,
                      COUNT(DISTINCT s.id) as active_students,
                      (SELECT COUNT(*) FROM classes c JOIN students st ON c.student_id = st.id WHERE st.assigned_ssc_id = u.id AND c.date BETWEEN ? AND ?) as total_classes,
                      (SELECT COUNT(*) FROM classes c JOIN students st ON c.student_id = st.id WHERE st.assigned_ssc_id = u.id AND c.date BETWEEN ? AND ? AND c.status='Completed' AND c.wrapup_status='VERIFIED') as conducted_classes,
                      (SELECT COUNT(DISTINCT CASE WHEN c.original_class_id IS NOT NULL THEN c.original_class_id ELSE c.id END) FROM classes c JOIN students st ON c.student_id = st.id WHERE st.assigned_ssc_id = u.id AND c.date BETWEEN ? AND ? AND c.status='RESCHEDULED') as rescheduled_classes,
                      (SELECT COUNT(*) FROM classes c JOIN students st ON c.student_id = st.id WHERE st.assigned_ssc_id = u.id AND c.date BETWEEN ? AND ? AND c.wrapup_status IN ('SUBMITTED', 'CORRECTION_REQUIRED')) as pending_wrapups,
                      (SELECT COUNT(DISTINCT sp.student_id) FROM student_packages sp JOIN students st ON sp.student_id = st.id WHERE st.assigned_ssc_id = u.id AND sp.end_date BETWEEN ? AND ?) as package_ending,
                      (SELECT COUNT(DISTINCT sp.student_id) FROM student_packages sp JOIN students st ON sp.student_id = st.id WHERE st.assigned_ssc_id = u.id AND sp.end_date BETWEEN ? AND ? AND sp.renewal_status='Renewed') as renewed_count
                    FROM users u
                    LEFT JOIN students s ON s.assigned_ssc_id = u.id AND s.status = 'Active'
                    WHERE u.role = 'SSC'
                    GROUP BY u.id
                    ORDER BY active_students DESC
                    ''', (start_str, end_str, start_str, end_str, start_str, end_str, start_str, end_str, start_str, end_str, start_str, end_str))
                    ssc_overview = [dict(r) for r in cursor.fetchall()]

                    # 8. Package Health
                    cursor.execute("SELECT COUNT(*) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND (renewal_status='Pending' OR renewal_status IS NULL OR renewal_status='')", (today_dt.isoformat(), (today_dt + timedelta(days=7)).isoformat()))
                    ending_7 = cursor.fetchone()['count']
                    cursor.execute("SELECT COUNT(*) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND (renewal_status='Pending' OR renewal_status IS NULL OR renewal_status='')", (today_dt.isoformat(), (today_dt + timedelta(days=15)).isoformat()))
                    ending_15 = cursor.fetchone()['count']
                    cursor.execute("SELECT COUNT(*) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND (renewal_status='Pending' OR renewal_status IS NULL OR renewal_status='')", (today_dt.isoformat(), (today_dt + timedelta(days=30)).isoformat()))
                    ending_30 = cursor.fetchone()['count']

                    package_health = {
                        'active': active_students,
                        'ending_7_days': ending_7,
                        'ending_15_days': ending_15,
                        'ending_30_days': ending_30,
                        'pending_renewal': pending_renewal_count,
                        'renewed': renewed_count,
                        'churned': churned_count
                    }

                    # 9. 6-Month Historical Trends
                    months_trend_cfg = [
                        ('April 2026', '2026-04-01', '2026-04-30'),
                        ('May 2026', '2026-05-01', '2026-05-31'),
                        ('June 2026', '2026-06-01', '2026-06-30'),
                        ('July 2026', '2026-07-01', '2026-07-31'),
                        ('August 2026', '2026-08-01', '2026-08-31'),
                        ('September 2026', '2026-09-01', '2026-09-30')
                    ]

                    renewal_trend = []
                    rescheduling_trend = []
                    package_ending_trend = []

                    for m_name, m_s, m_e in months_trend_cfg:
                        cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ?", (m_s, m_e))
                        m_elig = cursor.fetchone()['count']
                        cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND renewal_status='Renewed'", (m_s, m_e))
                        m_ren = cursor.fetchone()['count']
                        cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND renewal_status='Churned'", (m_s, m_e))
                        m_chu = cursor.fetchone()['count']
                        cursor.execute("SELECT COUNT(DISTINCT student_id) as count FROM student_packages WHERE end_date BETWEEN ? AND ? AND (renewal_status='Pending' OR renewal_status IS NULL OR renewal_status='')", (m_s, m_e))
                        m_pen = cursor.fetchone()['count']

                        m_ren_r = f"{round((m_ren / m_elig) * 100, 1)}%" if m_elig > 0 else "N/A"
                        renewal_trend.append({
                            'month': m_name,
                            'eligible': m_elig,
                            'renewed': m_ren,
                            'churned': m_chu,
                            'rate': m_ren_r
                        })
                        package_ending_trend.append({
                            'month': m_name,
                            'ending': m_elig,
                            'renewed': m_ren,
                            'pending': m_pen,
                            'churned': m_chu
                        })

                        cursor.execute("SELECT COUNT(*) as count FROM classes WHERE date BETWEEN ? AND ?", (m_s, m_e))
                        m_cls = cursor.fetchone()['count']
                        cursor.execute("SELECT COUNT(DISTINCT CASE WHEN original_class_id IS NOT NULL THEN original_class_id ELSE id END) as count FROM classes WHERE date BETWEEN ? AND ? AND status='RESCHEDULED'", (m_s, m_e))
                        m_res = cursor.fetchone()['count']
                        m_res_r = f"{round((m_res / m_cls) * 100, 1)}%" if m_cls > 0 else "N/A"
                        rescheduling_trend.append({
                            'month': m_name,
                            'total_classes': m_cls,
                            'rescheduled': m_res,
                            'rate': m_res_r
                        })

                    self.send_json({
                        'role': 'ACADEMIC_HEAD',
                        'period': period,
                        'from_date': start_str,
                        'to_date': end_str,
                        'summary': {
                            'active_students': active_students,
                            'new_students': new_students,
                            'package_ending': package_ending_count,
                            'renewed': renewed_count,
                            'churned': churned_count,
                            'pending_renewal': pending_renewal_count,
                            'rescheduled': rescheduled_count,
                            'renewal_rate': renewal_rate,
                            'churn_rate': churn_rate
                        },
                        'renewal_retention': {
                            'package_ending': package_ending_count,
                            'renewed': renewed_count,
                            'pending': pending_renewal_count,
                            'churned': churned_count,
                            'renewal_rate': renewal_rate,
                            'churn_rate': churn_rate
                        },
                        'churn_reasons': churn_reasons,
                        'upcoming_package_endings': upcoming_package_endings,
                        'class_operations': {
                            'scheduled': scheduled_classes,
                            'conducted': conducted_classes,
                            'rescheduled': rescheduled_count,
                            'postponed': postponed_classes,
                            'cancelled': cancelled_classes,
                            'no_show': no_show_classes,
                            'delivery_rate': delivery_rate,
                            'rescheduling_rate': rescheduling_rate,
                            'postponement_rate': postponement_rate,
                            'cancellation_rate': cancellation_rate,
                            'no_show_rate': no_show_rate
                        },
                        'attendance': {
                            'student_present': student_present,
                            'student_absent': student_absent,
                            'faculty_no_show': faculty_no_show,
                            'partial': partial_sessions,
                            'student_attendance_rate': student_attendance_rate
                        },
                        'session_reporting': {
                            'conducted': conducted_classes,
                            'submitted': wrapups_submitted,
                            'pending': wrapups_pending,
                            'verified': wrapups_verified,
                            'correction_required': wrapups_correction,
                            'verification_rate': wrapup_verification_rate,
                            'total_verified_minutes': total_verified_minutes,
                            'avg_session_duration': avg_session_duration
                        },
                        'student_success_operations': {
                            'pending_followups': pending_followups,
                            'pending_rescheduling': pending_rescheduling,
                            'pending_assessments': pending_assessments,
                            'attendance_concerns': attendance_concerns,
                            'academic_concerns': academic_concerns
                        },
                        'ssc_overview': ssc_overview,
                        'package_health': package_health,
                        'trends': {
                            'renewal': renewal_trend,
                            'rescheduling': rescheduling_trend,
                            'package_ending': package_ending_trend
                        }
                    })
                    return

                else:
                    ssc_id = user['id']

                    cursor.execute("SELECT COUNT(*) as count FROM students WHERE assigned_ssc_id=? AND status='Active'", (ssc_id,))
                    active_students = cursor.fetchone()['count']

                    cursor.execute('''
                    SELECT COUNT(*) as count FROM classes c
                    JOIN students s ON c.student_id = s.id
                    WHERE s.assigned_ssc_id=? AND c.date=?
                    ''', (ssc_id, today_str))
                    today_classes_count = cursor.fetchone()['count']

                    cursor.execute('''
                    SELECT COUNT(*) as count FROM followups f
                    JOIN students s ON f.student_id = s.id
                    WHERE s.assigned_ssc_id=? AND f.status='Pending'
                    ''', (ssc_id,))
                    pending_followups_count = cursor.fetchone()['count']

                    cursor.execute('''
                    SELECT COUNT(*) as count FROM rescheduling_requests r
                    JOIN students s ON r.student_id = s.id
                    WHERE s.assigned_ssc_id=? AND r.status='Pending'
                    ''', (ssc_id,))
                    rescheduling_requests_count = cursor.fetchone()['count']

                    cursor.execute('''
                    SELECT COUNT(*) as count FROM assessments a
                    JOIN students s ON a.student_id = s.id
                    WHERE s.assigned_ssc_id=? AND a.status IN ('Scheduled', 'Result Pending') AND a.date >= ?
                    ''', (ssc_id, today_str))
                    upcoming_assessments_count = cursor.fetchone()['count']

                    pending_actions_count = pending_followups_count + rescheduling_requests_count

                    cursor.execute('''
                    SELECT c.*, s.name as student_name, s.grade, f.name as faculty_name
                    FROM classes c
                    JOIN students s ON c.student_id = s.id
                    JOIN faculty f ON c.faculty_id = f.id
                    WHERE s.assigned_ssc_id=? AND c.date=?
                    ORDER BY c.start_time ASC
                    ''', (ssc_id, today_str))
                    today_schedule = [dict(r) for r in cursor.fetchall()]

                    pending_actions = []
                    cursor.execute('''
                    SELECT r.*, s.name as student_name, c.subject
                    FROM rescheduling_requests r
                    JOIN students s ON r.student_id = s.id
                    JOIN classes c ON r.class_id = c.id
                    WHERE s.assigned_ssc_id=? AND r.status='Pending'
                    ''', (ssc_id,))
                    for req in cursor.fetchall():
                        pending_actions.append({
                            'type': 'Rescheduling Request',
                            'title': f"{req['student_name']} — {req['subject']}",
                            'detail': f"Requested slot change from {req['original_date']} {req['original_time']} to {req['suggested_date']} {req['suggested_time']}",
                            'action_label': 'Review Request',
                            'target_module': 'rescheduling',
                            'id': req['id']
                        })

                    cursor.execute('''
                    SELECT f.*, s.name as student_name
                    FROM followups f
                    JOIN students s ON f.student_id = s.id
                    WHERE s.assigned_ssc_id=? AND f.status='Pending'
                    ORDER BY f.due_date ASC
                    LIMIT 5
                    ''', (ssc_id,))
                    for fu in cursor.fetchall():
                        pending_actions.append({
                            'type': f"Follow-up ({fu['type']})",
                            'title': f"{fu['student_name']} — Priority: {fu['priority']}",
                            'detail': fu['notes'],
                            'action_label': 'Complete Follow-up',
                            'target_module': 'followups',
                            'id': fu['id']
                        })

                    self.send_json({
                        'role': 'SSC',
                        'summary': {
                            'active_students': active_students,
                            'today_classes': today_classes_count,
                            'pending_actions': pending_actions_count,
                            'upcoming_assessments': upcoming_assessments_count,
                            'rescheduling_requests': rescheduling_requests_count
                        },
                        'today_schedule': today_schedule,
                        'pending_actions': pending_actions
                    })
                    return

            # API: SSC List (Academic Head Only)
            elif path == '/api/users/sscs':
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied'}, 403)
                
                today_str = date.today().isoformat()
                cursor.execute('''
                SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                  COUNT(DISTINCT s.id) as active_students,
                  (SELECT COUNT(*) FROM classes c JOIN students st ON c.student_id = st.id WHERE st.assigned_ssc_id = u.id AND c.date = ?) as today_classes,
                  (SELECT COUNT(*) FROM followups f JOIN students st ON f.student_id = st.id WHERE st.assigned_ssc_id = u.id AND f.status = 'Pending') as pending_actions
                FROM users u
                LEFT JOIN students s ON s.assigned_ssc_id = u.id AND s.status = 'Active'
                WHERE u.role = 'SSC'
                GROUP BY u.id
                ORDER BY u.name ASC
                ''', (today_str,))
                sscs = [dict(r) for r in cursor.fetchall()]
                self.send_json({'sscs': sscs})
                return

            # API: Students List (Scoped by Role)
            elif path == '/api/students':
                query = params.get('q', '').strip().lower()
                status_filter = params.get('status', '')
                ssc_filter = params.get('ssc_id', '')

                sql = '''
                SELECT s.*, f.name as faculty_name, f.phone as faculty_phone, u.name as ssc_name,
                  (SELECT c.date || ' ' || c.start_time FROM classes c WHERE c.student_id = s.id AND c.status = 'Scheduled' ORDER BY c.date ASC, c.start_time ASC LIMIT 1) as next_class
                FROM students s
                LEFT JOIN faculty f ON s.faculty_id = f.id
                LEFT JOIN users u ON s.assigned_ssc_id = u.id
                WHERE 1=1
                '''
                args = []

                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])
                elif ssc_filter:
                    if ssc_filter == 'unassigned':
                        sql += " AND s.assigned_ssc_id IS NULL"
                    else:
                        sql += " AND s.assigned_ssc_id = ?"
                        args.append(ssc_filter)

                if status_filter:
                    sql += " AND s.status = ?"
                    args.append(status_filter)

                if query:
                    sql += " AND (LOWER(s.name) LIKE ? OR LOWER(s.register_no) LIKE ? OR LOWER(s.parent_name) LIKE ? OR s.parent_phone LIKE ? OR s.student_phone LIKE ? OR LOWER(s.program) LIKE ? OR LOWER(f.name) LIKE ?)"
                    q_term = f"%{query}%"
                    args.extend([q_term, q_term, q_term, q_term, q_term, q_term, q_term])

                sql += " ORDER BY s.name ASC"
                cursor.execute(sql, args)
                students = [dict(r) for r in cursor.fetchall()]
                
                for st in students:
                    st['sessions_remaining'] = max(0, st['session_package'] - st['sessions_completed'])
                    cursor.execute('''
                    SELECT ss.subject, f.name as faculty_name
                    FROM student_subjects ss
                    LEFT JOIN faculty f ON ss.faculty_id = f.id
                    WHERE ss.student_id = ?
                    ''', (st['id'],))
                    sub_rows = cursor.fetchall()
                    if sub_rows:
                        st['subjects'] = ", ".join([r['subject'] for r in sub_rows])
                    else:
                        st['subjects'] = "Mathematics, Science" if st['id'] % 2 == 0 else "English, Humanities"

                self.send_json({'students': students})
                return

            # API: Student Profile Detail
            elif path.startswith('/api/students/') and not path.endswith(('/mark-completed', '/add-package', '/archive', '/restore', '/renewal-status')):
                student_id = int(path.split('/')[-1])
                cursor.execute('''
                SELECT s.*, f.name as faculty_name, f.phone as faculty_phone, u.name as ssc_name
                FROM students s
                LEFT JOIN faculty f ON s.faculty_id = f.id
                LEFT JOIN users u ON s.assigned_ssc_id = u.id
                WHERE s.id = ?
                ''', (student_id,))
                student = cursor.fetchone()
                if not student:
                    return self.send_json({'error': 'Student not found'}, 404)
                
                student = dict(student)
                
                if user['role'] == 'SSC' and student['assigned_ssc_id'] != user['id']:
                    return self.send_json({'error': 'Access Denied'}, 403)

                student['sessions_remaining'] = max(0, student['session_package'] - student['sessions_completed'])

                # Fetch Package History
                cursor.execute("SELECT * FROM student_packages WHERE student_id = ? ORDER BY id DESC", (student_id,))
                student['packages'] = [dict(r) for r in cursor.fetchall()]

                # Fetch Subjects with Faculty details
                cursor.execute('''
                SELECT ss.*, f.name as faculty_name, f.phone as faculty_phone
                FROM student_subjects ss
                LEFT JOIN faculty f ON ss.faculty_id = f.id
                WHERE ss.student_id = ?
                ORDER BY ss.id ASC
                ''', (student_id,))
                student['subjects_detail'] = [dict(r) for r in cursor.fetchall()]
                
                if student['subjects_detail']:
                    student['subjects'] = ", ".join([r['subject'] for r in student['subjects_detail']])
                else:
                    student['subjects'] = "Mathematics, Science" if student['id'] % 2 == 0 else "English, Humanities"

                # Fetch Current Master Weekly Timetable
                cursor.execute('''
                SELECT wt.*, f.name as faculty_name
                FROM weekly_timetables wt
                JOIN faculty f ON wt.faculty_id = f.id
                WHERE wt.student_id = ? AND wt.status = 'Active'
                ORDER BY CASE wt.day_of_week
                    WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
                END, wt.start_time ASC
                ''', (student_id,))
                student['weekly_timetable'] = [dict(r) for r in cursor.fetchall()]

                # Fetch Class Summary Statistics
                cursor.execute("SELECT status, COUNT(*) as count FROM classes WHERE student_id = ? GROUP BY status", (student_id,))
                raw_stats = {r['status'].upper(): r['count'] for r in cursor.fetchall()}
                student['class_summary'] = {
                    'total': sum(raw_stats.values()),
                    'completed': raw_stats.get('COMPLETED', 0),
                    'upcoming': raw_stats.get('SCHEDULED', 0),
                    'cancelled': raw_stats.get('CANCELLED', 0),
                    'rescheduled': raw_stats.get('RESCHEDULED', 0) + raw_stats.get('RESCHEDULED CLASS', 0),
                    'postponed': raw_stats.get('POSTPONED', 0),
                    'no_show': raw_stats.get('NO SHOW', 0)
                }

                today_str = date.today().isoformat()
                cursor.execute('''
                SELECT c.*, f.name as faculty_name
                FROM classes c
                JOIN faculty f ON c.faculty_id = f.id
                WHERE c.student_id = ? AND c.status IN ('SCHEDULED', 'Scheduled') AND c.date >= ?
                ORDER BY c.date ASC, c.start_time ASC
                LIMIT 1
                ''', (student_id, today_str))
                next_class = cursor.fetchone()
                student['next_class'] = dict(next_class) if next_class else None

                cursor.execute('''
                SELECT a.*, f.name as faculty_name
                FROM assessments a
                LEFT JOIN faculty f ON a.faculty_id = f.id
                WHERE a.student_id = ?
                ORDER BY a.date DESC
                ''', (student_id,))
                student['assessments_history'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute('''
                SELECT * FROM feedback WHERE student_id = ? ORDER BY date DESC
                ''', (student_id,))
                student['feedback_records'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute('''
                SELECT * FROM followups WHERE student_id = ? ORDER BY due_date ASC
                ''', (student_id,))
                student['followups'] = [dict(r) for r in cursor.fetchall()]

                # Complete Student Journey Timeline
                cursor.execute('''
                SELECT * FROM activity_log WHERE student_id = ? ORDER BY created_at DESC, id DESC
                ''', (student_id,))
                student['timeline'] = [dict(r) for r in cursor.fetchall()]

                self.send_json({'student': student})
                return

            # API: Faculty List & Search
            elif path == '/api/faculty':
                query = params.get('q', '').strip().lower()
                subject_filter = params.get('subject', '')
                syllabus_filter = params.get('syllabus', '')
                grade_filter = params.get('grade', '')
                status_filter = params.get('status', '')
                active_only = params.get('active_only', '') == 'true'

                sql = "SELECT * FROM faculty WHERE 1=1"
                args = []

                if active_only:
                    sql += " AND status='Active'"
                elif status_filter:
                    sql += " AND status=?"
                    args.append(status_filter)

                if subject_filter:
                    sql += " AND LOWER(subjects) LIKE ?"
                    args.append(f"%{subject_filter.lower()}%")

                if syllabus_filter:
                    sql += " AND LOWER(syllabuses) LIKE ?"
                    args.append(f"%{syllabus_filter.lower()}%")

                if grade_filter:
                    sql += " AND LOWER(grades) LIKE ?"
                    args.append(f"%{grade_filter.lower()}%")

                if query:
                    sql += " AND (LOWER(name) LIKE ? OR LOWER(faculty_code) LIKE ? OR phone LIKE ? OR LOWER(subjects) LIKE ?)"
                    q_term = f"%{query}%"
                    args.extend([q_term, q_term, q_term, q_term])

                sql += " ORDER BY name ASC"
                cursor.execute(sql, args)
                faculty_list = [dict(r) for r in cursor.fetchall()]

                today_str = date.today().isoformat()
                for f in faculty_list:
                    # Calculate active assigned students count
                    cursor.execute('''
                    SELECT COUNT(DISTINCT id) as count FROM students
                    WHERE (faculty_id = ? OR id IN (SELECT student_id FROM student_subjects WHERE faculty_id = ?))
                      AND status = 'Active'
                    ''', (f['id'], f['id']))
                    f['active_students'] = cursor.fetchone()['count']

                    # Calculate upcoming classes count
                    cursor.execute('''
                    SELECT COUNT(*) as count FROM classes
                    WHERE faculty_id = ? AND status IN ('Scheduled', 'SCHEDULED') AND date >= ?
                    ''', (f['id'], today_str))
                    f['upcoming_classes'] = cursor.fetchone()['count']

                    # Calculate completed classes count
                    cursor.execute('''
                    SELECT COUNT(*) as count FROM classes
                    WHERE faculty_id = ? AND status IN ('Completed', 'COMPLETED')
                    ''', (f['id'],))
                    f['completed_classes'] = cursor.fetchone()['count']

                self.send_json({'faculty': faculty_list})
                return

            # API: Faculty Profile Detail
            elif path.startswith('/api/faculty/'):
                faculty_id = int(path.split('/')[-1])
                cursor.execute("SELECT * FROM faculty WHERE id = ?", (faculty_id,))
                fac = cursor.fetchone()
                if not fac:
                    return self.send_json({'error': 'Faculty member not found'}, 404)

                fac = dict(fac)
                today_str = date.today().isoformat()

                # Calculate active assigned students count
                cursor.execute('''
                SELECT COUNT(DISTINCT id) as count FROM students
                WHERE (faculty_id = ? OR id IN (SELECT student_id FROM student_subjects WHERE faculty_id = ?))
                  AND status = 'Active'
                ''', (faculty_id, faculty_id))
                fac['active_students'] = cursor.fetchone()['count']

                # Calculate upcoming classes count
                cursor.execute('''
                SELECT COUNT(*) as count FROM classes
                WHERE faculty_id = ? AND status IN ('Scheduled', 'SCHEDULED') AND date >= ?
                ''', (faculty_id, today_str))
                fac['upcoming_classes'] = cursor.fetchone()['count']

                # Calculate completed classes count
                cursor.execute('''
                SELECT COUNT(*) as count FROM classes
                WHERE faculty_id = ? AND status IN ('Completed', 'COMPLETED')
                ''', (faculty_id,))
                fac['completed_classes'] = cursor.fetchone()['count']

                # Fetch list of active assigned students
                cursor.execute('''
                SELECT DISTINCT s.id, s.name, s.register_no, s.grade, s.program, s.status
                FROM students s
                WHERE (s.faculty_id = ? OR s.id IN (SELECT student_id FROM student_subjects WHERE faculty_id = ?))
                  AND s.status = 'Active'
                ORDER BY s.name ASC
                ''', (faculty_id, faculty_id))
                fac['assigned_students'] = [dict(r) for r in cursor.fetchall()]

                self.send_json({'faculty': fac})
                return

            # API: Pending Faculty Wrap-Ups Verification List
            elif path == '/api/wrapups/pending':
                if user['role'] == 'SSC':
                    cursor.execute('''
                    SELECT c.*, s.name as student_name, s.grade as student_grade, s.register_no as student_register_no,
                           f.name as faculty_name, f.phone as faculty_phone
                    FROM classes c
                    JOIN students s ON c.student_id = s.id
                    JOIN faculty f ON c.faculty_id = f.id
                    WHERE s.assigned_ssc_id = ? AND c.wrapup_status IN ('SUBMITTED', 'CORRECTION_REQUIRED')
                    ORDER BY c.date DESC, c.start_time DESC
                    ''', (user['id'],))
                else:
                    cursor.execute('''
                    SELECT c.*, s.name as student_name, s.grade as student_grade, s.register_no as student_register_no,
                           f.name as faculty_name, f.phone as faculty_phone
                    FROM classes c
                    JOIN students s ON c.student_id = s.id
                    JOIN faculty f ON c.faculty_id = f.id
                    WHERE c.wrapup_status IN ('SUBMITTED', 'CORRECTION_REQUIRED')
                    ORDER BY c.date DESC, c.start_time DESC
                    ''')
                rows = [dict(r) for r in cursor.fetchall()]
                self.send_json({'success': True, 'pending_wrapups': rows})
                return

            # API: Classes List (Scoped by Role)
            elif path == '/api/classes':
                today_str = date.today().isoformat()
                preset = params.get('preset', '')
                student_id = params.get('student_id', '')
                faculty_id = params.get('faculty_id', '')
                subject = params.get('subject', '')
                status = params.get('status', '')

                sql = '''
                SELECT c.*, s.name as student_name, s.grade, f.name as faculty_name
                FROM classes c
                JOIN students s ON c.student_id = s.id
                JOIN faculty f ON c.faculty_id = f.id
                WHERE 1=1
                '''
                args = []

                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                if preset == 'today':
                    sql += " AND c.date = ?"
                    args.append(today_str)
                elif preset == 'tomorrow':
                    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
                    sql += " AND c.date = ?"
                    args.append(tomorrow_str)
                elif preset == 'this_week':
                    start_of_week = date.today() - timedelta(days=date.today().weekday())
                    end_of_week = start_of_week + timedelta(days=6)
                    sql += " AND c.date BETWEEN ? AND ?"
                    args.extend([start_of_week.isoformat(), end_of_week.isoformat()])

                if student_id:
                    sql += " AND c.student_id = ?"
                    args.append(student_id)
                if faculty_id:
                    sql += " AND c.faculty_id = ?"
                    args.append(faculty_id)
                if subject:
                    sql += " AND c.subject = ?"
                    args.append(subject)
                if status:
                    sql += " AND c.status = ?"
                    args.append(status)

                sql += " ORDER BY c.date DESC, c.start_time ASC"
                cursor.execute(sql, args)
                classes = [dict(r) for r in cursor.fetchall()]
                self.send_json({'classes': classes})
                return

            # API: Weekly Master Timetable Slots (Scoped by Role)
            elif path == '/api/weekly-timetable':
                student_id = params.get('student_id')
                sql = '''
                SELECT wt.*, s.name as student_name, s.grade, f.name as faculty_name
                FROM weekly_timetables wt
                JOIN students s ON wt.student_id = s.id
                JOIN faculty f ON wt.faculty_id = f.id
                WHERE wt.status = 'Active'
                '''
                args = []
                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])
                if student_id:
                    sql += " AND wt.student_id = ?"
                    args.append(student_id)
                
                sql += ''' ORDER BY CASE wt.day_of_week
                    WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
                END, wt.start_time ASC'''
                cursor.execute(sql, args)
                slots = [dict(r) for r in cursor.fetchall()]
                self.send_json({'weekly_timetable': slots})
                return

            # API: Monthly Calendar Generated Occurrences (Scoped by Role)
            # API: Monthly Calendar Generated Occurrences & Metrics (Scoped by Role)
            elif path == '/api/calendar':
                year = int(params.get('year', datetime.now().year))
                month = int(params.get('month', datetime.now().month))
                student_id = params.get('student_id')
                faculty_id = params.get('faculty_id')
                subject_filter = params.get('subject')
                status_filter = params.get('status')

                st_id_int = int(student_id) if student_id else None
                start_date = f"{year:04d}-{month:02d}-01"
                last_day = calendar.monthrange(year, month)[1]
                end_date = f"{year:04d}-{month:02d}-{last_day:02d}"

                # Base SQL query for all classes in selected month for scoped user
                sql = '''
                SELECT c.*, s.name as student_name, s.register_no, s.grade, s.program,
                       f.name as faculty_name, f.phone as faculty_phone, wt.day_of_week
                FROM classes c
                JOIN students s ON c.student_id = s.id
                JOIN faculty f ON c.faculty_id = f.id
                LEFT JOIN weekly_timetables wt ON c.weekly_timetable_id = wt.id
                WHERE c.date BETWEEN ? AND ?
                '''
                args = [start_date, end_date]

                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                if student_id:
                    sql += " AND c.student_id = ?"
                    args.append(student_id)

                if faculty_id:
                    sql += " AND c.faculty_id = ?"
                    args.append(faculty_id)

                if subject_filter:
                    sql += " AND LOWER(c.subject) = ?"
                    args.append(subject_filter.lower())

                if status_filter:
                    sql += " AND UPPER(c.status) = ?"
                    args.append(status_filter.upper())

                sql += " ORDER BY c.date ASC, c.start_time ASC"
                cursor.execute(sql, args)
                classes = [dict(r) for r in cursor.fetchall()]

                # Calculate Summary Metrics for the scoped user & month
                metrics_sql = '''
                SELECT c.status, c.topic_covered, c.attendance
                FROM classes c
                JOIN students s ON c.student_id = s.id
                WHERE c.date BETWEEN ? AND ?
                '''
                m_args = [start_date, end_date]
                if user['role'] == 'SSC':
                    metrics_sql += " AND s.assigned_ssc_id = ?"
                    m_args.append(user['id'])
                if student_id:
                    metrics_sql += " AND c.student_id = ?"
                    m_args.append(student_id)

                cursor.execute(metrics_sql, m_args)
                all_month_classes = [dict(r) for r in cursor.fetchall()]

                total_classes = len(all_month_classes)
                conducted = 0
                upcoming = 0
                rescheduled = 0
                postponed = 0
                cancelled = 0
                no_show = 0
                wrapup_pending = 0

                for mc in all_month_classes:
                    st = (mc.get('status') or '').upper()
                    if st in ('COMPLETED', 'CONDUCTED'):
                        conducted += 1
                        if not mc.get('topic_covered'):
                            wrapup_pending += 1
                    elif st in ('SCHEDULED'):
                        upcoming += 1
                    elif st in ('RESCHEDULED', 'RESCHEDULED CLASS'):
                        rescheduled += 1
                    elif st in ('POSTPONED', 'POSTPONED CLASS'):
                        postponed += 1
                    elif st in ('CANCELLED'):
                        cancelled += 1
                    elif st in ('NO SHOW', 'NO_SHOW'):
                        no_show += 1

                exceptions = rescheduled + postponed + cancelled + no_show

                # Fetch assigned students for filter dropdown
                st_sql = "SELECT id, name, register_no, grade FROM students WHERE status='Active'"
                st_args = []
                if user['role'] == 'SSC':
                    st_sql += " AND assigned_ssc_id = ?"
                    st_args.append(user['id'])
                st_sql += " ORDER BY name ASC"
                cursor.execute(st_sql, st_args)
                assigned_students = [dict(r) for r in cursor.fetchall()]

                total_students = len(assigned_students)

                # Fetch faculty list for filter dropdown
                cursor.execute("SELECT id, name, phone, subjects FROM faculty WHERE status='Active' ORDER BY name ASC")
                faculty_list = [dict(r) for r in cursor.fetchall()]

                self.send_json({
                    'year': year,
                    'month': month,
                    'summary': {
                        'total_students': total_students,
                        'total_classes': total_classes,
                        'conducted': conducted,
                        'upcoming': upcoming,
                        'exceptions': exceptions,
                        'rescheduled': rescheduled,
                        'postponed': postponed,
                        'cancelled': cancelled,
                        'no_show': no_show,
                        'wrapup_pending': wrapup_pending
                    },
                    'classes': classes,
                    'assigned_students': assigned_students,
                    'faculty': faculty_list
                })
                return

            # API: Class History / Audit Trail
            elif path.startswith('/api/classes/') and path.endswith('/history'):
                parts = path.split('/')
                class_id = int(parts[-2])
                cursor.execute('''
                SELECT ch.*
                FROM class_history ch
                WHERE ch.class_occurrence_id = ?
                ORDER BY ch.changed_at DESC, ch.id DESC
                ''', (class_id,))
                history = [dict(r) for r in cursor.fetchall()]
                self.send_json({'class_id': class_id, 'history': history})
                return

            # API: Legacy Timetable Grid Data (Scoped by Role)
            elif path == '/api/timetable':
                start_of_week = date.today() - timedelta(days=date.today().weekday())
                days_map = {}
                for i in range(6):
                    day_date = start_of_week + timedelta(days=i)
                    days_map[day_date.isoformat()] = day_date.strftime('%A')

                sql = '''
                SELECT c.*, s.name as student_name, s.grade, f.name as faculty_name
                FROM classes c
                JOIN students s ON c.student_id = s.id
                JOIN faculty f ON c.faculty_id = f.id
                WHERE c.date BETWEEN ? AND ?
                '''
                args = [start_of_week.isoformat(), (start_of_week + timedelta(days=5)).isoformat()]

                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                sql += " ORDER BY c.start_time ASC"
                cursor.execute(sql, args)
                classes = [dict(r) for r in cursor.fetchall()]
                self.send_json({
                    'start_of_week': start_of_week.isoformat(),
                    'days_map': days_map,
                    'classes': classes
                })
                return

            # API: Rescheduling Requests List (Scoped by Role)
            elif path == '/api/rescheduling':
                sql = '''
                SELECT r.*, s.name as student_name, s.grade, c.subject, f.name as faculty_name
                FROM rescheduling_requests r
                JOIN students s ON r.student_id = s.id
                JOIN classes c ON r.class_id = c.id
                JOIN faculty f ON c.faculty_id = f.id
                WHERE 1=1
                '''
                args = []
                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                sql += " ORDER BY r.created_at DESC"
                cursor.execute(sql, args)
                requests = [dict(r) for r in cursor.fetchall()]
                self.send_json({'rescheduling_requests': requests})
                return

            # API: Assessments List (Scoped by Role)
            elif path == '/api/assessments':
                sql = '''
                SELECT a.*, s.name as student_name, s.grade, f.name as faculty_name
                FROM assessments a
                JOIN students s ON a.student_id = s.id
                LEFT JOIN faculty f ON a.faculty_id = f.id
                WHERE 1=1
                '''
                args = []
                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                sql += " ORDER BY a.date ASC, a.time ASC"
                cursor.execute(sql, args)
                assessments = [dict(r) for r in cursor.fetchall()]
                self.send_json({'assessments': assessments})
                return

            # API: Followups List (Scoped by Role)
            elif path == '/api/followups':
                sql = '''
                SELECT f.*, s.name as student_name, s.parent_phone, s.grade
                FROM followups f
                JOIN students s ON f.student_id = s.id
                WHERE 1=1
                '''
                args = []
                if user['role'] == 'SSC':
                    sql += " AND s.assigned_ssc_id = ?"
                    args.append(user['id'])

                sql += " ORDER BY f.status ASC, f.due_date ASC"
                cursor.execute(sql, args)
                followups = [dict(r) for r in cursor.fetchall()]
                self.send_json({'followups': followups})
                return

            # API: Basic Reports (Scoped by Role)
            elif path == '/api/reports':
                ssc_id = user['id'] if user['role'] == 'SSC' else None

                if ssc_id:
                    cursor.execute("SELECT status, COUNT(*) as count FROM students WHERE assigned_ssc_id=? GROUP BY status", (ssc_id,))
                    student_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT c.status, COUNT(*) as count FROM classes c JOIN students s ON c.student_id=s.id WHERE s.assigned_ssc_id=? GROUP BY c.status", (ssc_id,))
                    class_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT a.status, COUNT(*) as count FROM assessments a JOIN students s ON a.student_id=s.id WHERE s.assigned_ssc_id=? GROUP BY a.status", (ssc_id,))
                    assessment_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT f.status, COUNT(*) as count FROM followups f JOIN students s ON f.student_id=s.id WHERE s.assigned_ssc_id=? GROUP BY f.status", (ssc_id,))
                    followup_stats = {r['status']: r['count'] for r in cursor.fetchall()}
                else:
                    cursor.execute("SELECT status, COUNT(*) as count FROM students GROUP BY status")
                    student_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT status, COUNT(*) as count FROM classes GROUP BY status")
                    class_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT status, COUNT(*) as count FROM assessments GROUP BY status")
                    assessment_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                    cursor.execute("SELECT status, COUNT(*) as count FROM followups GROUP BY status")
                    followup_stats = {r['status']: r['count'] for r in cursor.fetchall()}

                self.send_json({
                    'students': student_stats,
                    'classes': class_stats,
                    'assessments': assessment_stats,
                    'followups': followup_stats
                })
                return

            else:
                self.send_json({'error': 'Not Found'}, 404)

        finally:
            conn.close()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.get_body_json()

        # Login endpoint (Public)
        if path == '/api/auth/login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            pass_hash = database.hash_password(password)

            conn = database.get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email)=? AND password_hash=?", (email, pass_hash))
            user = cursor.fetchone()

            if not user:
                conn.close()
                return self.send_json({'error': 'Invalid email or password'}, 401)
            
            user = dict(user)
            if user['status'] != 'Active':
                conn.close()
                return self.send_json({'error': 'Account is inactive. Please contact Academic Head.'}, 403)

            session_id = str(uuid.uuid4())
            expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            cursor.execute("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
                           (session_id, user['id'], expires_at))
            conn.commit()
            conn.close()

            user_data = {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role'],
                'status': user['status']
            }

            cookie_str = f"session_id={session_id}; Path=/; HttpOnly; SameSite=Lax"
            # Return token explicitly in JSON response for tab-isolated sessionStorage
            return self.send_json({'success': True, 'token': session_id, 'user': user_data}, set_cookie=cookie_str)

        # Logout endpoint (Tab-isolated by revoking specific token)
        if path == '/api/auth/logout':
            session_id = self.headers.get('X-Session-ID')
            if not session_id:
                auth_header = self.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    session_id = auth_header.split('Bearer ')[1].strip()
            if not session_id:
                cookies = self.get_cookies()
                session_id = cookies.get('session_id')

            if session_id:
                conn = database.get_db()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sessions WHERE session_id=?", (session_id,))
                conn.commit()
                conn.close()
            
            cookie_str = "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
            return self.send_json({'success': True}, set_cookie=cookie_str)

        # Public API: Submit Session Wrap-Up Report (No Login Required)
        if path.startswith('/api/session-wrapup/'):
            tok = path.split('/api/session-wrapup/')[1].strip()
            conn = database.get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM classes WHERE wrapup_token = ?", (tok,))
            cls = cursor.fetchone()
            if not cls:
                conn.close()
                return self.send_json({'error': 'Invalid wrap-up token'}, 404)
            
            cls = dict(cls)
            if cls['status'] in ('CANCELLED', 'Cancelled'):
                conn.close()
                return self.send_json({'error': 'This session was cancelled. Wrap-up is not required.'}, 400)
            
            if cls['wrapup_status'] == 'VERIFIED':
                conn.close()
                return self.send_json({'error': 'This session wrap-up report has already been verified and finalized.'}, 400)

            session_status = body.get('session_status', 'Completed')
            actual_start = body.get('actual_start_time', '').strip()
            actual_end = body.get('actual_end_time', '').strip()
            topic = body.get('topic_covered', '').strip()
            homework = body.get('homework', '').strip()
            homework_given = body.get('homework_given', 'Yes')
            student_perf = body.get('student_performance', 'Good')
            faculty_remarks = body.get('faculty_remarks', '').strip()
            next_rec = body.get('next_session_rec', '').strip()

            calc_minutes = int(cls.get('duration') or 60)
            if actual_start and actual_end:
                try:
                    def parse_time_str(t_str):
                        t_str = t_str.strip().upper()
                        for fmt in ['%H:%M', '%I:%M %p', '%H:%M:%S', '%I:%M:%S %p']:
                            try:
                                return datetime.strptime(t_str, fmt)
                            except ValueError:
                                pass
                        return None

                    t1 = parse_time_str(actual_start)
                    t2 = parse_time_str(actual_end)
                    if t1 and t2:
                        diff_sec = (t2 - t1).total_seconds()
                        if diff_sec < 0:
                            diff_sec += 24 * 3600
                        calc_minutes = max(1, int(round(diff_sec / 60.0)))
                except Exception:
                    calc_minutes = int(cls.get('duration') or 60)

            cursor.execute('''
            UPDATE classes
            SET wrapup_status = 'SUBMITTED',
                session_status = ?,
                actual_start_time = ?,
                actual_end_time = ?,
                actual_minutes = ?,
                topic_covered = ?,
                homework = ?,
                homework_given = ?,
                student_performance = ?,
                faculty_remarks = ?,
                next_session_rec = ?
            WHERE id = ?
            ''', (
                session_status, actual_start, actual_end, calc_minutes,
                topic, homework, homework_given, student_perf,
                faculty_remarks, next_rec, cls['id']
            ))

            cursor.execute('''
            INSERT INTO class_history (class_occurrence_id, action, requested_by, reason, changed_by)
            VALUES (?, 'FACULTY_WRAPUP_SUBMITTED', 'Faculty', 'Faculty submitted session wrap-up report', 'Faculty')
            ''', (cls['id'],))

            cursor.execute("SELECT name FROM faculty WHERE id=?", (cls['faculty_id'],))
            fac_row = cursor.fetchone()
            fac_name = fac_row['name'] if fac_row else 'Faculty'

            cursor.execute('''
            INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
            VALUES (?, NULL, 'Session Wrap-up Submitted', ?, ?)
            ''', (cls['student_id'], f"Session wrap-up report submitted by {fac_name} for {cls['subject']} class ({calc_minutes} mins).", fac_name))

            conn.commit()
            conn.close()

            return self.send_json({
                'success': True,
                'message': 'Wrap-up submitted successfully.',
                'calculated_minutes': calc_minutes,
                'wrapup_status': 'SUBMITTED'
            })

        # Authenticate all other POST endpoints
        user = self.get_authenticated_user()
        if not user:
            return self.send_json({'error': 'Unauthorized'}, 401)

        conn = database.get_db()
        cursor = conn.cursor()

        try:
            # Register New Faculty (Academic Head Only)
            if path == '/api/faculty':
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied: Only Academic Head can register faculty.'}, 403)

                name = body.get('name', '').strip()
                phone = body.get('phone', '').strip()
                if not name or not phone:
                    return self.send_json({'error': 'Faculty Name and Contact Number are required.'}, 400)

                subjects_raw = body.get('subjects', [])
                subjects_str = ", ".join(subjects_raw) if isinstance(subjects_raw, list) else str(subjects_raw)
                
                syllabuses_raw = body.get('syllabuses', [])
                syllabuses_str = ", ".join(syllabuses_raw) if isinstance(syllabuses_raw, list) else str(syllabuses_raw)
                
                grades_raw = body.get('grades', [])
                grades_str = ", ".join(grades_raw) if isinstance(grades_raw, list) else str(grades_raw)

                status = body.get('status', 'Active')
                f_code = generate_faculty_code(cursor)

                cursor.execute('''
                INSERT INTO faculty (faculty_code, name, phone, subjects, syllabuses, grades, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (f_code, name, phone, subjects_str, syllabuses_str, grades_str, status))
                new_fac_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (actor_user_id, activity_type, description, created_by)
                VALUES (?, 'Faculty Registered', ?, ?)
                ''', (user['id'], f"Registered faculty '{name}' ({f_code}) with contact {phone}.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'faculty_id': new_fac_id, 'faculty_code': f_code})
                return

            # Create SSC Account (Academic Head Only)
            elif path == '/api/users/sscs':
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied'}, 403)
                
                email = body.get('email', '').strip().lower()
                pass_hash = database.hash_password(body.get('password', 'ssc123'))

                cursor.execute("SELECT id FROM users WHERE LOWER(email)=?", (email,))
                if cursor.fetchone():
                    return self.send_json({'error': 'An account with this email already exists'}, 400)

                cursor.execute('''
                INSERT INTO users (name, email, phone, password_hash, role, status)
                VALUES (?, ?, ?, ?, 'SSC', ?)
                ''', (body.get('name'), email, body.get('phone'), pass_hash, body.get('status', 'Active')))
                new_ssc_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (actor_user_id, activity_type, description, created_by)
                VALUES (?, 'SSC Account Created', ?, ?)
                ''', (user['id'], f"Created SSC account for {body.get('name')} ({email}).", user['name']))

                conn.commit()
                self.send_json({'success': True, 'ssc_id': new_ssc_id})
                return

            # Register Student (Academic Head or SSC)
            elif path == '/api/students':
                assigned_ssc_id = body.get('assigned_ssc_id')
                if user['role'] == 'SSC':
                    assigned_ssc_id = user['id']

                reg_no = generate_register_no(cursor)
                preferred_lang = body.get('preferred_language', 'English')
                program = body.get('program', 'Classmate 1-on-1')
                session_pkg = int(body.get('session_package', 24))
                notes = body.get('notes', '')

                cursor.execute('''
                INSERT INTO students (register_no, name, grade, board, school, parent_name, parent_phone, student_phone, preferred_language, program, status, preferred_time, session_package, sessions_completed, faculty_id, assigned_ssc_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, 0, ?, ?)
                ''', (
                    reg_no, body.get('name'), body.get('grade'), body.get('board'), body.get('school'),
                    body.get('parent_name'), body.get('parent_phone'), body.get('student_phone', ''),
                    preferred_lang, program, body.get('preferred_time', '4:00 PM'), session_pkg,
                    body.get('faculty_id'), assigned_ssc_id
                ))
                student_id = cursor.lastrowid

                today_str = date.today().isoformat()
                cursor.execute('''
                INSERT INTO student_packages (student_id, program, session_package, sessions_completed, status, start_date, notes)
                VALUES (?, ?, ?, 0, 'Active', ?, ?)
                ''', (student_id, program, session_pkg, today_str, notes or 'Initial Registration'))
                pkg_id = cursor.lastrowid

                subjects_data = body.get('subjects', [])
                if subjects_data:
                    for sub in subjects_data:
                        if sub.get('subject') and sub.get('faculty_id'):
                            cursor.execute('''
                            INSERT INTO student_subjects (student_id, package_id, subject, faculty_id, assigned_days)
                            VALUES (?, ?, ?, ?, ?)
                            ''', (student_id, pkg_id, sub.get('subject'), sub.get('faculty_id'), sub.get('assigned_days', 'Mon, Wed')))
                elif body.get('faculty_id'):
                    cursor.execute('''
                    INSERT INTO student_subjects (student_id, package_id, subject, faculty_id, assigned_days)
                    VALUES (?, ?, ?, ?, 'Mon, Wed')
                    ''', (student_id, pkg_id, 'Mathematics', body.get('faculty_id')))

                ssc_name = 'Unassigned'
                if assigned_ssc_id:
                    cursor.execute("SELECT name FROM users WHERE id=?", (assigned_ssc_id,))
                    ssc_row = cursor.fetchone()
                    if ssc_row: ssc_name = ssc_row['name']

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Student Registered', ?, ?)
                ''', (student_id, user['id'], f"Registered student ({reg_no}) and assigned to SSC: {ssc_name}.", user['name']))
                
                conn.commit()
                self.send_json({'success': True, 'student_id': student_id, 'register_no': reg_no})
                return

            # Lifecycle: Mark Course Completed
            elif path.endswith('/mark-completed') and path.startswith('/api/students/'):
                student_id = int(path.split('/')[-2])
                cursor.execute("UPDATE students SET status='Course Completed' WHERE id=?", (student_id,))
                cursor.execute("UPDATE student_packages SET status='Completed' WHERE student_id=? AND status='Active'", (student_id,))
                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Course Completed', 'Marked student course as completed.', ?)
                ''', (student_id, user['id'], user['name']))
                conn.commit()
                self.send_json({'success': True})
                return

            # Lifecycle: Add New Package
            elif path.endswith('/add-package') and path.startswith('/api/students/'):
                student_id = int(path.split('/')[-2])
                program = body.get('program', 'Classmate 1-on-1')
                session_pkg = int(body.get('session_package', 24))
                notes = body.get('notes', 'New enrollment package added')
                today_str = date.today().isoformat()

                cursor.execute("UPDATE student_packages SET status='Completed' WHERE student_id=? AND status='Active'", (student_id,))
                cursor.execute('''
                INSERT INTO student_packages (student_id, program, session_package, sessions_completed, status, start_date, notes)
                VALUES (?, ?, ?, 0, 'Active', ?, ?)
                ''', (student_id, program, session_pkg, today_str, notes))
                pkg_id = cursor.lastrowid

                cursor.execute('''
                UPDATE students SET status='Active', program=?, session_package=?, sessions_completed=0 WHERE id=?
                ''', (program, session_pkg, student_id))

                subjects_data = body.get('subjects', [])
                if subjects_data:
                    for sub in subjects_data:
                        if sub.get('subject') and sub.get('faculty_id'):
                            cursor.execute('''
                            INSERT INTO student_subjects (student_id, package_id, subject, faculty_id, assigned_days)
                            VALUES (?, ?, ?, ?, ?)
                            ''', (student_id, pkg_id, sub.get('subject'), sub.get('faculty_id'), sub.get('assigned_days', 'Mon, Wed')))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'New Package Added', ?, ?)
                ''', (student_id, user['id'], f"Added package {program} ({session_pkg} sessions).", user['name']))
                conn.commit()
                self.send_json({'success': True, 'package_id': pkg_id})
                return

            # Lifecycle: Archive Student
            elif path.endswith('/archive') and path.startswith('/api/students/'):
                student_id = int(path.split('/')[-2])
                cursor.execute("UPDATE students SET status='Archived', assigned_ssc_id=NULL WHERE id=?", (student_id,))
                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Student Archived', 'Archived student profile and unassigned SSC.', ?)
                ''', (student_id, user['id'], user['name']))
                conn.commit()
                self.send_json({'success': True})
                return

            # Lifecycle: Restore Student
            elif path.endswith('/restore') and path.startswith('/api/students/'):
                student_id = int(path.split('/')[-2])
                new_ssc_id = body.get('assigned_ssc_id')
                cursor.execute("UPDATE students SET status='Active', assigned_ssc_id=? WHERE id=?", (new_ssc_id, student_id))
                
                ssc_name = 'Unassigned'
                if new_ssc_id:
                    cursor.execute("SELECT name FROM users WHERE id=?", (new_ssc_id,))
                    ssc_row = cursor.fetchone()
                    if ssc_row: ssc_name = ssc_row['name']

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Student Restored', ?, ?)
                ''', (student_id, user['id'], f"Restored archived student (Assigned SSC: {ssc_name}).", user['name']))
                conn.commit()
                self.send_json({'success': True})
                return

            # Student Renewal Status Update
            elif path.endswith('/renewal-status') and path.startswith('/api/students/'):
                student_id = int(path.split('/')[-2])
                status_val = body.get('renewal_status')
                churn_reason = body.get('churn_reason')
                churn_notes = body.get('churn_notes')

                if status_val not in ('Renewed', 'Pending', 'Churned'):
                    return self.send_json({'error': 'Invalid renewal status'}, 400)

                cursor.execute("""
                    UPDATE students 
                    SET renewal_status=?, churn_reason=?, churn_notes=? 
                    WHERE id=?
                """, (status_val, churn_reason if status_val == 'Churned' else None, churn_notes if status_val == 'Churned' else None, student_id))

                cursor.execute("""
                    UPDATE student_packages
                    SET renewal_status=?, churn_reason=?, churn_notes=?
                    WHERE student_id=? AND (status='Active' OR id=(SELECT MAX(id) FROM student_packages WHERE student_id=?))
                """, (status_val, churn_reason if status_val == 'Churned' else None, churn_notes if status_val == 'Churned' else None, student_id, student_id))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Renewal Status Updated', ?, ?)
                ''', (student_id, user['id'], f"Renewal status updated to '{status_val}'" + (f" (Reason: {churn_reason})" if churn_reason else ""), user['name']))
                conn.commit()
                self.send_json({'success': True})
                return

            # Create/Set Master Weekly Timetable (Bulk Student-Level Multi-Subject Setup)
            elif path == '/api/weekly-timetable/bulk':
                student_id = body.get('student_id')
                if not student_id:
                    return self.send_json({'error': 'Student selection is required.'}, 400)
                student_id = int(student_id)
                effective_from = body.get('effective_from', date.today().isoformat())
                slots = body.get('slots', [])

                cursor.execute("SELECT id, name FROM students WHERE id = ?", (student_id,))
                st_row = cursor.fetchone()
                if not st_row:
                    return self.send_json({'error': 'Student not found.'}, 404)
                student_name = st_row['name']

                # 1. Internal Student Conflict Validation (within payload slots)
                for i in range(len(slots)):
                    slot_a = slots[i]
                    start_a = parse_time_to_minutes(slot_a.get('start_time'))
                    dur_a = int(slot_a.get('duration', 60))
                    end_a = start_a + dur_a
                    day_a = slot_a.get('day_of_week')

                    for j in range(i + 1, len(slots)):
                        slot_b = slots[j]
                        if slot_b.get('day_of_week') == day_a:
                            start_b = parse_time_to_minutes(slot_b.get('start_time'))
                            dur_b = int(slot_b.get('duration', 60))
                            end_b = start_b + dur_b

                            if max(start_a, start_b) < min(end_a, end_b):
                                return self.send_json({
                                    'error': f"Student Schedule Conflict: {student_name} has overlapping slots on {day_a} ({slot_a.get('subject')} at {slot_a.get('start_time')} and {slot_b.get('subject')} at {slot_b.get('start_time')})."
                                }, 400)

                # 2. Faculty Overlap Validation (against other active student timetables in DB)
                for slot in slots:
                    fac_id = int(slot.get('faculty_id', 0))
                    if not fac_id:
                        continue
                    day_w = slot.get('day_of_week')
                    start_m = parse_time_to_minutes(slot.get('start_time'))
                    dur_m = int(slot.get('duration', 60))
                    end_m = start_m + dur_m

                    cursor.execute('''
                    SELECT wt.*, s.name as other_student_name, f.name as faculty_name
                    FROM weekly_timetables wt
                    JOIN students s ON wt.student_id = s.id
                    JOIN faculty f ON wt.faculty_id = f.id
                    WHERE wt.faculty_id = ? AND wt.day_of_week = ? AND wt.status = 'Active' AND wt.student_id != ?
                    ''', (fac_id, day_w, student_id))
                    existing_faculty_slots = cursor.fetchall()

                    for ex_slot in existing_faculty_slots:
                        ex_start = parse_time_to_minutes(ex_slot['start_time'])
                        ex_end = ex_start + int(ex_slot['duration'])
                        if max(start_m, ex_start) < min(end_m, ex_end):
                            return self.send_json({
                                'error': f"Faculty Schedule Conflict: {ex_slot['faculty_name']} is already assigned to student '{ex_slot['other_student_name']}' on {day_w} at {ex_slot['start_time']}."
                            }, 400)

                # 3. Save Master Weekly Slots for Student
                cursor.execute("UPDATE weekly_timetables SET status = 'Inactive' WHERE student_id = ? AND status = 'Active'", (student_id,))
                
                saved_ids = []
                for slot in slots:
                    subject = slot.get('subject')
                    faculty_id = int(slot.get('faculty_id'))
                    day_of_week = slot.get('day_of_week')
                    start_time = slot.get('start_time')
                    duration = int(slot.get('duration', 60))
                    meeting_link = slot.get('meeting_link', 'https://meet.google.com/mash-magic-class')

                    cursor.execute('''
                    INSERT INTO weekly_timetables (student_id, subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
                    ''', (student_id, subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from))
                    saved_ids.append(cursor.lastrowid)

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Timetable Updated', ?, ?)
                ''', (student_id, user['id'], f"Updated master weekly timetable: configured {len(slots)} weekly slot(s) for {student_name}.", user['name']))

                conn.commit()

                # Generate calendar occurrences for current and next month from effective_from date
                try:
                    eff_dt = datetime.strptime(effective_from, '%Y-%m-%d').date()
                    database.generate_monthly_occurrences(conn, eff_dt.year, eff_dt.month, student_id)
                    next_m_dt = (eff_dt.replace(day=28) + timedelta(days=5)).replace(day=1)
                    database.generate_monthly_occurrences(conn, next_m_dt.year, next_m_dt.month, student_id)
                except Exception as e:
                    pass

                self.send_json({'success': True, 'saved_slots_count': len(saved_ids)})
                return

            # Create/Set Master Weekly Timetable Slot
            elif path == '/api/weekly-timetable':
                student_id = int(body.get('student_id'))
                subject = body.get('subject')
                faculty_id = int(body.get('faculty_id'))
                day_of_week = body.get('day_of_week')
                start_time = body.get('start_time')
                duration = int(body.get('duration', 60))
                meeting_link = body.get('meeting_link', 'https://meet.google.com/mash-magic-class')
                effective_from = body.get('effective_from', date.today().isoformat())

                cursor.execute('''
                SELECT id FROM weekly_timetables
                WHERE student_id = ? AND day_of_week = ? AND start_time = ? AND status = 'Active'
                ''', (student_id, day_of_week, start_time))
                existing_slot = cursor.fetchone()

                if existing_slot:
                    slot_id = existing_slot['id']
                    cursor.execute('''
                    UPDATE weekly_timetables
                    SET subject=?, faculty_id=?, duration=?, meeting_link=?, effective_from=?
                    WHERE id=?
                    ''', (subject, faculty_id, duration, meeting_link, effective_from, slot_id))
                else:
                    cursor.execute('''
                    INSERT INTO weekly_timetables (student_id, subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
                    ''', (student_id, subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from))
                    slot_id = cursor.lastrowid

                cursor.execute("SELECT name FROM students WHERE id=?", (student_id,))
                st_row = cursor.fetchone()
                st_name = st_row['name'] if st_row else 'Student'

                cursor.execute("SELECT name FROM faculty WHERE id=?", (faculty_id,))
                fac_row = cursor.fetchone()
                fac_name = fac_row['name'] if fac_row else 'Faculty'

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Timetable Created', ?, ?)
                ''', (student_id, user['id'], f"Set weekly timetable slot: {day_of_week} {start_time} for {subject} with {fac_name}.", user['name']))

                conn.commit()

                # Generate calendar occurrences for current and next month from effective_from date
                try:
                    eff_dt = datetime.strptime(effective_from, '%Y-%m-%d').date()
                    database.generate_monthly_occurrences(conn, eff_dt.year, eff_dt.month, student_id)
                    next_m_dt = (eff_dt.replace(day=28) + timedelta(days=5)).replace(day=1)
                    database.generate_monthly_occurrences(conn, next_m_dt.year, next_m_dt.month, student_id)
                except Exception as e:
                    pass

                self.send_json({'success': True, 'weekly_timetable_id': slot_id})
                return

            # Cancel Class Occurrence
            elif path.endswith('/cancel') and path.startswith('/api/classes/'):
                class_id = int(path.split('/')[-2])
                cursor.execute("SELECT * FROM classes WHERE id=?", (class_id,))
                cls = cursor.fetchone()
                if not cls:
                    return self.send_json({'error': 'Class occurrence not found'}, 404)
                cls = dict(cls)

                requested_by = body.get('requested_by', 'SSC')
                reason = body.get('reason', 'No reason provided')

                cursor.execute('''
                UPDATE classes
                SET status='CANCELLED', cancellation_reason=?, change_requested_by=?
                WHERE id=?
                ''', (reason, requested_by, class_id))

                cursor.execute('''
                INSERT INTO class_history (class_occurrence_id, action, old_date, old_time, requested_by, reason, changed_by)
                VALUES (?, 'CANCELLED', ?, ?, ?, ?, ?)
                ''', (class_id, cls['date'], cls['start_time'], requested_by, reason, user['name']))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Class Cancelled', ?, ?)
                ''', (cls['student_id'], user['id'], f"Cancelled {cls['subject']} class on {cls['date']} at {cls['start_time']}. Requested by: {requested_by}. Reason: {reason}", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            # Reschedule Class Occurrence
            elif path.endswith('/reschedule') and path.startswith('/api/classes/'):
                class_id = int(path.split('/')[-2])
                cursor.execute("SELECT * FROM classes WHERE id=?", (class_id,))
                cls = cursor.fetchone()
                if not cls:
                    return self.send_json({'error': 'Class occurrence not found'}, 404)
                cls = dict(cls)

                new_date = body.get('suggested_date') or body.get('new_date')
                new_time = body.get('suggested_time') or body.get('new_time')
                faculty_id = body.get('faculty_id') or cls['faculty_id']
                requested_by = body.get('requested_by', 'SSC')
                reason = body.get('reason', 'Rescheduled by request')

                # Mark original class as RESCHEDULED
                cursor.execute('''
                UPDATE classes
                SET status='RESCHEDULED', cancellation_reason=?, change_requested_by=?
                WHERE id=?
                ''', (reason, requested_by, class_id))

                # Create NEW class occurrence
                new_tok = uuid.uuid4().hex
                cursor.execute('''
                INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, weekly_timetable_id, cancellation_reason, change_requested_by, original_class_id, notes, wrapup_token, wrapup_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, NULL, ?, ?, ?, ?, 'PENDING')
                ''', (
                    cls['student_id'], faculty_id, cls['subject'],
                    new_date, new_time, cls['duration'], cls['meeting_link'],
                    cls['weekly_timetable_id'], requested_by, class_id,
                    f"Rescheduled from {cls['date']} {cls['start_time']} ({reason})", new_tok
                ))
                new_class_id = cursor.lastrowid

                # History for original class
                cursor.execute('''
                INSERT INTO class_history (class_occurrence_id, action, old_date, old_time, new_date, new_time, requested_by, reason, changed_by)
                VALUES (?, 'RESCHEDULED', ?, ?, ?, ?, ?, ?, ?)
                ''', (class_id, cls['date'], cls['start_time'], new_date, new_time, requested_by, reason, user['name']))

                # History for new class
                cursor.execute('''
                INSERT INTO class_history (class_occurrence_id, action, old_date, old_time, new_date, new_time, requested_by, reason, changed_by)
                VALUES (?, 'RESCHEDULED CLASS', ?, ?, ?, ?, ?, ?, ?)
                ''', (new_class_id, cls['date'], cls['start_time'], new_date, new_time, requested_by, reason, user['name']))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Class Rescheduled', ?, ?)
                ''', (cls['student_id'], user['id'], f"Rescheduled {cls['subject']} class from {cls['date']} {cls['start_time']} to {new_date} {new_time}. Requested by: {requested_by}. Reason: {reason}", user['name']))

                conn.commit()
                self.send_json({'success': True, 'new_class_id': new_class_id, 'wrapup_token': new_tok})
                return

            # Postpone Class Occurrence
            elif path.endswith('/postpone') and path.startswith('/api/classes/'):
                class_id = int(path.split('/')[-2])
                cursor.execute("SELECT * FROM classes WHERE id=?", (class_id,))
                cls = cursor.fetchone()
                if not cls:
                    return self.send_json({'error': 'Class occurrence not found'}, 404)
                cls = dict(cls)

                new_date = body.get('new_date') or body.get('suggested_date')
                new_time = body.get('new_time') or body.get('suggested_time')
                requested_by = body.get('requested_by', 'SSC')
                reason = body.get('reason', 'Postponed')

                # Mark original as POSTPONED
                cursor.execute('''
                UPDATE classes
                SET status='POSTPONED', cancellation_reason=?, change_requested_by=?
                WHERE id=?
                ''', (reason, requested_by, class_id))

                # Create NEW class occurrence
                postpone_tok = uuid.uuid4().hex
                cursor.execute('''
                INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, weekly_timetable_id, cancellation_reason, change_requested_by, original_class_id, notes, wrapup_token, wrapup_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, NULL, ?, ?, ?, ?, 'PENDING')
                ''', (
                    cls['student_id'], cls['faculty_id'], cls['subject'],
                    new_date, new_time, cls['duration'], cls['meeting_link'],
                    cls['weekly_timetable_id'], requested_by, class_id,
                    f"Postponed from {cls['date']} {cls['start_time']} ({reason})", postpone_tok
                ))
                new_class_id = cursor.lastrowid

                # Log in history
                cursor.execute('''
                INSERT INTO class_history (class_occurrence_id, action, old_date, old_time, new_date, new_time, requested_by, reason, changed_by)
                VALUES (?, 'POSTPONED', ?, ?, ?, ?, ?, ?, ?)
                ''', (class_id, cls['date'], cls['start_time'], new_date, new_time, requested_by, reason, user['name']))

                cursor.execute('''
                INSERT INTO class_history (class_occurrence_id, action, old_date, old_time, new_date, new_time, requested_by, reason, changed_by)
                VALUES (?, 'POSTPONED CLASS', ?, ?, ?, ?, ?, ?, ?)
                ''', (new_class_id, cls['date'], cls['start_time'], new_date, new_time, requested_by, reason, user['name']))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Class Postponed', ?, ?)
                ''', (cls['student_id'], user['id'], f"Postponed {cls['subject']} class from {cls['date']} {cls['start_time']} to {new_date} {new_time}. Requested by: {requested_by}. Reason: {reason}", user['name']))

                conn.commit()
                self.send_json({'success': True, 'new_class_id': new_class_id})
                return

            # Reassign Student (Academic Head Only)
            elif path == '/api/students/reassign':
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied'}, 403)
                
                student_id = body.get('student_id')
                new_ssc_id = body.get('new_ssc_id')

                cursor.execute('''
                SELECT s.name as student_name, s.assigned_ssc_id, u.name as old_ssc_name
                FROM students s
                LEFT JOIN users u ON s.assigned_ssc_id = u.id
                WHERE s.id = ?
                ''', (student_id,))
                st = cursor.fetchone()
                if not st:
                    return self.send_json({'error': 'Student not found'}, 404)
                st = dict(st)

                new_ssc_name = 'Unassigned'
                if new_ssc_id:
                    cursor.execute("SELECT name FROM users WHERE id=?", (new_ssc_id,))
                    n_row = cursor.fetchone()
                    if n_row: new_ssc_name = n_row['name']

                cursor.execute("UPDATE students SET assigned_ssc_id=? WHERE id=?", (new_ssc_id, student_id))

                old_name = st['old_ssc_name'] or 'Unassigned'
                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Student Reassigned', ?, ?)
                ''', (student_id, user['id'], f"Reassigned student from '{old_name}' to '{new_ssc_name}'.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'old_ssc': old_name, 'new_ssc': new_ssc_name})
                return

            # SSC Verify & Finalize Session Wrap-Up Report
            elif path.endswith('/verify-wrapup') and path.startswith('/api/classes/'):
                class_id = int(path.split('/')[-2])
                cursor.execute("SELECT * FROM classes WHERE id=?", (class_id,))
                cls = cursor.fetchone()
                if not cls:
                    return self.send_json({'error': 'Class occurrence not found'}, 404)
                cls = dict(cls)

                action = body.get('action', 'APPROVE')  # APPROVE or SEND_BACK
                attendance = body.get('attendance', 'Present')
                final_minutes = int(body.get('final_minutes', cls.get('actual_minutes') or cls.get('duration') or 60))
                ssc_remarks = body.get('ssc_remarks', '').strip()
                correction_reason = body.get('correction_reason', '').strip()

                if action == 'SEND_BACK':
                    if not correction_reason:
                        return self.send_json({'error': 'Correction reason is required when sending back to faculty'}, 400)
                    
                    cursor.execute('''
                    UPDATE classes
                    SET wrapup_status = 'CORRECTION_REQUIRED',
                        correction_reason = ?,
                        ssc_remarks = ?
                    WHERE id = ?
                    ''', (correction_reason, ssc_remarks, class_id))

                    cursor.execute('''
                    INSERT INTO class_history (class_occurrence_id, action, requested_by, reason, changed_by)
                    VALUES (?, 'WRAPUP_SENT_BACK', ?, ?, ?)
                    ''', (class_id, user['name'], correction_reason, user['name']))

                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Wrap-up Correction Requested', ?, ?)
                    ''', (cls['student_id'], user['id'], f"Session wrap-up sent back to faculty for correction by SSC {user['name']}. Reason: {correction_reason}", user['name']))

                    conn.commit()
                    return self.send_json({'success': True, 'wrapup_status': 'CORRECTION_REQUIRED'})

                else:  # APPROVE & FINALIZE
                    verified_at = datetime.now().isoformat()
                    cursor.execute('''
                    UPDATE classes
                    SET wrapup_status = 'VERIFIED',
                        status = 'Completed',
                        attendance = ?,
                        actual_minutes = ?,
                        ssc_remarks = ?,
                        verified_by = ?,
                        verified_at = ?
                    WHERE id = ?
                    ''', (attendance, final_minutes, ssc_remarks, user['name'], verified_at, class_id))

                    # Increment student sessions_completed count
                    cursor.execute('''
                    UPDATE students
                    SET sessions_completed = sessions_completed + 1
                    WHERE id = ?
                    ''', (cls['student_id'],))

                    cursor.execute('''
                    INSERT INTO class_history (class_occurrence_id, action, requested_by, reason, changed_by)
                    VALUES (?, 'VERIFIED', ?, ?, ?)
                    ''', (class_id, user['name'], f"Verified {final_minutes} mins class. Attendance: {attendance}", user['name']))

                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Session Verified', ?, ?)
                    ''', (cls['student_id'], user['id'], f"Session verified by SSC {user['name']}. {cls['subject']} class finalized ({final_minutes} mins). Attendance: {attendance}.", user['name']))

                    conn.commit()
                    return self.send_json({'success': True, 'wrapup_status': 'VERIFIED', 'final_minutes': final_minutes})

            # Create Class
            elif path == '/api/classes':
                tok = uuid.uuid4().hex
                cursor.execute('''
                INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, notes, wrapup_token, wrapup_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, 'PENDING')
                ''', (
                    body.get('student_id'), body.get('faculty_id'), body.get('subject'),
                    body.get('date'), body.get('start_time'), int(body.get('duration', 60)),
                    body.get('meeting_link', 'https://meet.google.com/mash-magic-class'),
                    body.get('notes', ''), tok
                ))
                class_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Class Scheduled', ?, ?)
                ''', (body.get('student_id'), user['id'], f"Scheduled {body.get('subject')} class for {body.get('date')} at {body.get('start_time')}.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'class_id': class_id, 'wrapup_token': tok})
                return

            # Create Rescheduling Request
            elif path == '/api/rescheduling':
                cursor.execute('''
                INSERT INTO rescheduling_requests (class_id, student_id, original_date, original_time, suggested_date, suggested_time, reason, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
                ''', (
                    body.get('class_id'), body.get('student_id'), body.get('original_date'),
                    body.get('original_time'), body.get('suggested_date'), body.get('suggested_time'),
                    body.get('reason')
                ))
                req_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Rescheduling Requested', ?, ?)
                ''', (body.get('student_id'), user['id'], f"Rescheduling requested for class on {body.get('original_date')} {body.get('original_time')}. Reason: {body.get('reason')}", user['name']))

                conn.commit()
                self.send_json({'success': True, 'rescheduling_id': req_id})
                return

            # Approve Rescheduling Request
            elif path.endswith('/approve') and path.startswith('/api/rescheduling/'):
                req_id = int(path.split('/')[-2])
                cursor.execute("SELECT * FROM rescheduling_requests WHERE id=?", (req_id,))
                req = cursor.fetchone()
                if not req:
                    return self.send_json({'error': 'Request not found'}, 404)
                
                req = dict(req)

                cursor.execute("UPDATE classes SET status='Rescheduled' WHERE id=?", (req['class_id'],))
                
                cursor.execute("SELECT * FROM classes WHERE id=?", (req['class_id'],))
                orig_cls = dict(cursor.fetchone())

                cursor.execute('''
                INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)
                ''', (
                    orig_cls['student_id'], orig_cls['faculty_id'], orig_cls['subject'],
                    req['suggested_date'], req['suggested_time'], orig_cls['duration'],
                    orig_cls['meeting_link'], f"Rescheduled from {req['original_date']} {req['original_time']}"
                ))
                new_class_id = cursor.lastrowid

                cursor.execute("UPDATE rescheduling_requests SET status='Approved' WHERE id=?", (req_id,))

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Class Rescheduled', ?, ?)
                ''', (req['student_id'], user['id'], f"Approved class rescheduling from {req['original_date']} {req['original_time']} to {req['suggested_date']} {req['suggested_time']}.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'new_class_id': new_class_id})
                return

            # Create Assessment
            elif path == '/api/assessments':
                cursor.execute('''
                INSERT INTO assessments (student_id, subject, type, date, time, faculty_id, duration, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)
                ''', (
                    body.get('student_id'), body.get('subject'), body.get('type'),
                    body.get('date'), body.get('time'), body.get('faculty_id'),
                    int(body.get('duration', 45)), body.get('notes', '')
                ))
                assessment_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Assessment Scheduled', ?, ?)
                ''', (body.get('student_id'), user['id'], f"Scheduled {body.get('type')} in {body.get('subject')} for {body.get('date')}.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'assessment_id': assessment_id})
                return

            # Create Follow-up
            elif path == '/api/followups':
                cursor.execute('''
                INSERT INTO followups (student_id, type, due_date, priority, notes, status)
                VALUES (?, ?, ?, ?, ?, 'Pending')
                ''', (
                    body.get('student_id'), body.get('type'), body.get('due_date'),
                    body.get('priority', 'Medium'), body.get('notes')
                ))
                fu_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Follow-up Created', ?, ?)
                ''', (body.get('student_id'), user['id'], f"Created {body.get('type')} follow-up due on {body.get('due_date')}. Priority: {body.get('priority')}.", user['name']))

                conn.commit()
                self.send_json({'success': True, 'followup_id': fu_id})
                return

            # Record Feedback
            elif path == '/api/feedback':
                today_str = date.today().isoformat()
                cursor.execute('''
                INSERT INTO feedback (student_id, feedback_type, date, rating_status, comments, follow_up_required, submitted_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    body.get('student_id'), body.get('feedback_type'), today_str,
                    body.get('rating_status'), body.get('comments'),
                    1 if body.get('follow_up_required') else 0, user['name']
                ))
                fb_id = cursor.lastrowid

                cursor.execute('''
                INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                VALUES (?, ?, 'Feedback Recorded', ?, ?)
                ''', (body.get('student_id'), user['id'], f"Recorded {body.get('feedback_type')} feedback: '{body.get('rating_status')}'.", user['name']))

                if body.get('follow_up_required'):
                    cursor.execute('''
                    INSERT INTO followups (student_id, type, due_date, priority, notes, status)
                    VALUES (?, 'Feedback', ?, 'High', ?, 'Pending')
                    ''', (body.get('student_id'), today_str, f"Follow up on feedback: {body.get('comments')}"))

                conn.commit()
                self.send_json({'success': True, 'feedback_id': fb_id})
                return

            else:
                self.send_json({'error': 'Endpoint not found'}, 404)

        finally:
            conn.close()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.get_body_json()

        user = self.get_authenticated_user()
        if not user:
            return self.send_json({'error': 'Unauthorized'}, 401)

        conn = database.get_db()
        cursor = conn.cursor()

        try:
            # Edit / Update Faculty (Academic Head Only)
            if path.startswith('/api/faculty/'):
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied: Only Academic Head can edit faculty.'}, 403)

                faculty_id = int(path.split('/')[-1])
                cursor.execute("SELECT * FROM faculty WHERE id=?", (faculty_id,))
                fac = cursor.fetchone()
                if not fac:
                    return self.send_json({'error': 'Faculty member not found'}, 404)

                fac = dict(fac)
                name = body.get('name', fac['name']).strip()
                phone = body.get('phone', fac['phone']).strip()

                subjects_raw = body.get('subjects', fac['subjects'])
                subjects_str = ", ".join(subjects_raw) if isinstance(subjects_raw, list) else str(subjects_raw)

                syllabuses_raw = body.get('syllabuses', fac['syllabuses'])
                syllabuses_str = ", ".join(syllabuses_raw) if isinstance(syllabuses_raw, list) else str(syllabuses_raw)

                grades_raw = body.get('grades', fac['grades'])
                grades_str = ", ".join(grades_raw) if isinstance(grades_raw, list) else str(grades_raw)

                status = body.get('status', fac['status'])

                cursor.execute('''
                UPDATE faculty
                SET name=?, phone=?, subjects=?, syllabuses=?, grades=?, status=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
                ''', (name, phone, subjects_str, syllabuses_str, grades_str, status, faculty_id))

                cursor.execute('''
                INSERT INTO activity_log (actor_user_id, activity_type, description, created_by)
                VALUES (?, 'Faculty Profile Updated', ?, ?)
                ''', (user['id'], f"Updated faculty profile for '{name}' ({fac['faculty_code']}). Status: {status}.", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            # Toggle SSC Status (Academic Head Only)
            elif path.startswith('/api/users/sscs/'):
                if user['role'] != 'ACADEMIC_HEAD':
                    return self.send_json({'error': 'Access Denied'}, 403)
                
                ssc_id = int(path.split('/')[-1])
                new_status = body.get('status', 'Active')

                cursor.execute("UPDATE users SET status=? WHERE id=? AND role='SSC'", (new_status, ssc_id))
                
                cursor.execute('''
                INSERT INTO activity_log (actor_user_id, activity_type, description, created_by)
                VALUES (?, 'SSC Status Changed', ?, ?)
                ''', (user['id'], f"Updated SSC status (ID: {ssc_id}) to {new_status}.", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            # Update Class Details / Attendance / Faculty Report
            elif path.startswith('/api/classes/'):
                class_id = int(path.split('/')[-1])
                cursor.execute("SELECT * FROM classes WHERE id=?", (class_id,))
                cls = cursor.fetchone()
                if not cls:
                    return self.send_json({'error': 'Class not found'}, 404)
                cls = dict(cls)

                status = body.get('status', cls['status'])
                attendance = body.get('attendance', cls['attendance'])
                topic_covered = body.get('topic_covered', cls['topic_covered'])
                homework = body.get('homework', cls['homework'])
                student_performance = body.get('student_performance', cls['student_performance'])
                faculty_remarks = body.get('faculty_remarks', cls['faculty_remarks'])

                cursor.execute('''
                UPDATE classes
                SET status=?, attendance=?, topic_covered=?, homework=?, student_performance=?, faculty_remarks=?
                WHERE id=?
                ''', (status, attendance, topic_covered, homework, student_performance, faculty_remarks, class_id))

                if attendance == 'Present' and cls['attendance'] != 'Present':
                    cursor.execute('''
                    UPDATE students
                    SET sessions_completed = sessions_completed + 1
                    WHERE id = ?
                    ''', (cls['student_id'],))
                    
                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Class Completed', ?, ?)
                    ''', (cls['student_id'], user['id'], f"Completed {cls['subject']} class. Attendance: Present.", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            # Update Assessment Result
            elif path.startswith('/api/assessments/'):
                assessment_id = int(path.split('/')[-1])
                score = float(body.get('score', 0))
                max_score = float(body.get('max_score', 100))
                percentage = (score / max_score * 100) if max_score > 0 else 0

                cursor.execute('''
                UPDATE assessments
                SET score=?, max_score=?, percentage=?, status='Completed', faculty_remark=?, ssc_remark=?
                WHERE id=?
                ''', (score, max_score, percentage, body.get('faculty_remark'), body.get('ssc_remark'), assessment_id))

                cursor.execute("SELECT student_id, subject, type FROM assessments WHERE id=?", (assessment_id,))
                ass = cursor.fetchone()
                if ass:
                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Assessment Result Recorded', ?, ?)
                    ''', (ass['student_id'], user['id'], f"Scored {score}/{max_score} ({percentage:.1f}%) in {ass['subject']} ({ass['type']}).", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            # Edit Master Weekly Timetable Slot
            elif path.startswith('/api/weekly-timetable/'):
                slot_id = int(path.split('/')[-1])
                subject = body.get('subject')
                faculty_id = int(body.get('faculty_id'))
                day_of_week = body.get('day_of_week')
                start_time = body.get('start_time')
                duration = int(body.get('duration', 60))
                meeting_link = body.get('meeting_link', 'https://meet.google.com/mash-magic-class')
                effective_from = body.get('effective_from', date.today().isoformat())

                cursor.execute('''
                UPDATE weekly_timetables
                SET subject=?, faculty_id=?, day_of_week=?, start_time=?, duration=?, meeting_link=?, effective_from=?
                WHERE id=?
                ''', (subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from, slot_id))

                cursor.execute("SELECT student_id FROM weekly_timetables WHERE id=?", (slot_id,))
                wt_row = cursor.fetchone()
                if wt_row:
                    st_id = wt_row['student_id']
                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Weekly Slot Edited', ?, ?)
                    ''', (st_id, user['id'], f"Edited weekly slot (ID: {slot_id}) to {day_of_week} {start_time} ({subject}).", user['name']))

                    try:
                        eff_dt = datetime.strptime(effective_from, '%Y-%m-%d').date()
                        database.generate_monthly_occurrences(conn, eff_dt.year, eff_dt.month, st_id)
                    except Exception:
                        pass

                conn.commit()
                self.send_json({'success': True})
                return

            # Update Follow-up Status
            elif path.startswith('/api/followups/'):
                fu_id = int(path.split('/')[-1])
                status = body.get('status', 'Completed')

                cursor.execute("UPDATE followups SET status=? WHERE id=?", (status, fu_id))
                
                cursor.execute("SELECT student_id, type FROM followups WHERE id=?", (fu_id,))
                fu = cursor.fetchone()
                if fu:
                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Follow-up Completed', ?, ?)
                    ''', (fu['student_id'], user['id'], f"Completed {fu['type']} follow-up.", user['name']))

                conn.commit()
                self.send_json({'success': True})
                return

            else:
                self.send_json({'error': 'Endpoint not found'}, 404)

        finally:
            conn.close()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        user = self.get_authenticated_user()
        if not user:
            return self.send_json({'error': 'Unauthorized'}, 401)

        conn = database.get_db()
        cursor = conn.cursor()

        try:
            if path.startswith('/api/weekly-timetable/'):
                slot_id = int(path.split('/')[-1])
                cursor.execute("SELECT * FROM weekly_timetables WHERE id=?", (slot_id,))
                slot = cursor.fetchone()
                if slot:
                    slot = dict(slot)
                    cursor.execute("UPDATE weekly_timetables SET status='Inactive' WHERE id=?", (slot_id,))
                    cursor.execute('''
                    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_by)
                    VALUES (?, ?, 'Weekly Slot Removed', ?, ?)
                    ''', (slot['student_id'], user['id'], f"Removed weekly slot: {slot['day_of_week']} {slot['start_time']} ({slot['subject']}). Historical classes preserved.", user['name']))
                    conn.commit()
                self.send_json({'success': True})
                return
            else:
                self.send_json({'error': 'Endpoint not found'}, 404)
        finally:
            conn.close()

class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True

def run(server_class=ReusableHTTPServer, handler_class=SSCHandler, port=PORT):
    database.init_db()
    database.seed_data()
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"SSC Operations Management Server running on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == '__main__':
    run()
