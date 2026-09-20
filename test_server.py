import os
import unittest
import json
import sqlite3
from io import BytesIO
from datetime import date, timedelta
import database
import server

class MockSSCHandler(server.SSCHandler):
    def __init__(self, path, method='GET', body_data=None, session_id=None):
        self.path = path
        self.command = method
        self.rfile = BytesIO(json.dumps(body_data).encode('utf-8') if body_data else b"")
        self.wfile = BytesIO()
        headers = {}
        if body_data:
            headers['Content-Length'] = str(len(json.dumps(body_data)))
        if session_id:
            headers['Cookie'] = f"session_id={session_id}"
        self.headers = headers
        self.response_status = None
        self.response_headers = {}

    def send_response(self, code, message=None):
        self.response_status = code

    def send_header(self, keyword, value):
        self.response_headers[keyword] = value

    def end_headers(self):
        pass

    def send_error(self, code, message=None):
        self.response_status = code

class TestSSCAuthSystem(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Fresh db reset
        db_file = database.DB_FILE
        if os.path.exists(db_file):
            os.remove(db_file)
        database.init_db()
        database.seed_data()

    def test_login_flow(self):
        # 1. Valid Academic Head Login
        login_body = {'email': 'head@mashmagic.com', 'password': 'admin123'}
        handler = MockSSCHandler('/api/auth/login', method='POST', body_data=login_body)
        handler.do_POST()
        self.assertEqual(handler.response_status, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(res['success'])
        self.assertEqual(res['user']['role'], 'ACADEMIC_HEAD')

        # Extract session_id cookie
        cookie_header = handler.response_headers.get('Set-Cookie', '')
        self.assertIn('session_id=', cookie_header)
        head_session = cookie_header.split('session_id=')[1].split(';')[0]

        # 2. Test /api/auth/me for Head
        me_handler = MockSSCHandler('/api/auth/me', method='GET', session_id=head_session)
        me_handler.do_GET()
        self.assertEqual(me_handler.response_status, 200)
        me_data = json.loads(me_handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(me_data['authenticated'])
        self.assertEqual(me_data['user']['email'], 'head@mashmagic.com')

    def test_ssc_login_and_data_isolation(self):
        # 1. Login as SSC Ananya
        login_body = {'email': 'ananya@mashmagic.com', 'password': 'ssc123'}
        handler = MockSSCHandler('/api/auth/login', method='POST', body_data=login_body)
        handler.do_POST()
        self.assertEqual(handler.response_status, 200)
        cookie_header = handler.response_headers.get('Set-Cookie', '')
        ananya_session = cookie_header.split('session_id=')[1].split(';')[0]

        # 2. Login as SSC Riya
        login_body_riya = {'email': 'riya@mashmagic.com', 'password': 'ssc123'}
        handler_r = MockSSCHandler('/api/auth/login', method='POST', body_data=login_body_riya)
        handler_r.do_POST()
        self.assertEqual(handler_r.response_status, 200)
        cookie_r = handler_r.response_headers.get('Set-Cookie', '')
        riya_session = cookie_r.split('session_id=')[1].split(';')[0]

        # 3. Ananya fetches /api/students
        ananya_students_handler = MockSSCHandler('/api/students', method='GET', session_id=ananya_session)
        ananya_students_handler.do_GET()
        ananya_students = json.loads(ananya_students_handler.wfile.getvalue().decode('utf-8'))['students']

        # 4. Riya fetches /api/students
        riya_students_handler = MockSSCHandler('/api/students', method='GET', session_id=riya_session)
        riya_students_handler.do_GET()
        riya_students = json.loads(riya_students_handler.wfile.getvalue().decode('utf-8'))['students']

        # Verify data isolation: Ananya & Riya see different student lists!
        self.assertGreater(len(ananya_students), 0)
        self.assertGreater(len(riya_students), 0)
        ananya_ids = {s['id'] for s in ananya_students}
        riya_ids = {s['id'] for s in riya_students}
        self.assertTrue(ananya_ids.isdisjoint(riya_ids))

    def test_student_reassignment_workflow(self):
        # Login Head
        login_body = {'email': 'head@mashmagic.com', 'password': 'admin123'}
        handler = MockSSCHandler('/api/auth/login', method='POST', body_data=login_body)
        handler.do_POST()
        head_session = handler.response_headers.get('Set-Cookie', '').split('session_id=')[1].split(';')[0]

        # Reassign Student #1 (Ayaan) from SSC 1 (Ananya, ID: 2) to SSC 2 (Riya, ID: 3)
        reassign_body = {'student_id': 1, 'new_ssc_id': 3}
        re_handler = MockSSCHandler('/api/students/reassign', method='POST', body_data=reassign_body, session_id=head_session)
        re_handler.do_POST()
        self.assertEqual(re_handler.response_status, 200)
        re_data = json.loads(re_handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(re_data['success'])

        # Verify Student #1 is now assigned to SSC 2 (Riya, ID: 3)
        conn = database.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT assigned_ssc_id FROM students WHERE id=1")
        st = cursor.fetchone()
        self.assertEqual(st['assigned_ssc_id'], 3)
        conn.close()

    def test_create_ssc_account_and_inactive_block(self):
        # Login Head
        login_body = {'email': 'head@mashmagic.com', 'password': 'admin123'}
        handler = MockSSCHandler('/api/auth/login', method='POST', body_data=login_body)
        handler.do_POST()
        head_session = handler.response_headers.get('Set-Cookie', '').split('session_id=')[1].split(';')[0]

        # Create new SSC
        ssc_body = {
            'name': 'Pooja Nair',
            'email': 'pooja@mashmagic.com',
            'phone': '+919800112233',
            'password': 'password123',
            'status': 'Active'
        }
        create_handler = MockSSCHandler('/api/users/sscs', method='POST', body_data=ssc_body, session_id=head_session)
        create_handler.do_POST()
        self.assertEqual(create_handler.response_status, 200)
        new_ssc_id = json.loads(create_handler.wfile.getvalue().decode('utf-8'))['ssc_id']

        # Toggle to Inactive
        status_handler = MockSSCHandler(f'/api/users/sscs/{new_ssc_id}', method='PUT', body_data={'status': 'Inactive'}, session_id=head_session)
        status_handler.do_PUT()
        self.assertEqual(status_handler.response_status, 200)

        # Attempt Login as Inactive SSC -> expect 403 Forbidden
        inactive_login = MockSSCHandler('/api/auth/login', method='POST', body_data={'email': 'pooja@mashmagic.com', 'password': 'password123'})
        inactive_login.do_POST()
        self.assertEqual(inactive_login.response_status, 403)

if __name__ == '__main__':
    unittest.main()
