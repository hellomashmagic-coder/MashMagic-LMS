import os
import unittest
import json
from io import BytesIO
import database
import server

class MockSSCHandler(server.SSCHandler):
    def __init__(self, path, method='GET', body_data=None, session_token=None):
        self.path = path
        self.command = method
        self.rfile = BytesIO(json.dumps(body_data).encode('utf-8') if body_data else b"")
        self.wfile = BytesIO()
        headers = {}
        if body_data:
            headers['Content-Length'] = str(len(json.dumps(body_data)))
        if session_token:
            headers['X-Session-ID'] = session_token
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

def login_and_get_token(email, password):
    handler = MockSSCHandler('/api/auth/login', method='POST', body_data={'email': email, 'password': password})
    handler.do_POST()
    assert handler.response_status == 200
    res = json.loads(handler.wfile.getvalue().decode('utf-8'))
    return res['token'], res['user']

class TestMultiTabAuthIsolation(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db_file = database.DB_FILE
        if os.path.exists(db_file):
            os.remove(db_file)
        database.init_db()
        database.seed_data()

    def test_simultaneous_multi_tab_isolation_and_logout(self):
        print("\n--- Executing Multi-Tab Session Isolation & Logout Test ---")

        # 1. TAB 1: Login as Academic Head
        head_token, head_user = login_and_get_token('head@mashmagic.com', 'admin123')
        self.assertEqual(head_user['role'], 'ACADEMIC_HEAD')
        print(f"✓ Tab 1 Logged in as Academic Head (Token: {head_token[:8]}...)")

        # 2. TAB 2: Login as SSC Ananya
        ssc_token, ssc_user = login_and_get_token('ananya@mashmagic.com', 'ssc123')
        self.assertEqual(ssc_user['role'], 'SSC')
        print(f"✓ Tab 2 Logged in as SSC Ananya (Token: {ssc_token[:8]}...)")

        # 3. Verify TAB 1 request with X-Session-ID: head_token returns Academic Head Profile
        h1 = MockSSCHandler('/api/auth/me', method='GET', session_token=head_token)
        h1.do_GET()
        self.assertEqual(h1.response_status, 200)
        u1 = json.loads(h1.wfile.getvalue().decode('utf-8'))['user']
        self.assertEqual(u1['email'], 'head@mashmagic.com')
        print("✓ Tab 1 /api/auth/me correctly returns Academic Head profile")

        # 4. Verify TAB 2 request with X-Session-ID: ssc_token returns SSC Ananya Profile
        h2 = MockSSCHandler('/api/auth/me', method='GET', session_token=ssc_token)
        h2.do_GET()
        self.assertEqual(h2.response_status, 200)
        u2 = json.loads(h2.wfile.getvalue().decode('utf-8'))['user']
        self.assertEqual(u2['email'], 'ananya@mashmagic.com')
        print("✓ Tab 2 /api/auth/me correctly returns SSC Ananya profile")

        # 5. Authorization Check: TAB 2 (SSC) attempting Head-only endpoint /api/users/sscs returns 403 Forbidden
        h_auth = MockSSCHandler('/api/users/sscs', method='GET', session_token=ssc_token)
        h_auth.do_GET()
        self.assertEqual(h_auth.response_status, 403)
        print("✓ Tab 2 (SSC) access to Head-only API correctly denied (403 Forbidden)")

        # 6. TAB 2 LOGOUT: Logout from Tab 2
        h_logout = MockSSCHandler('/api/auth/logout', method='POST', session_token=ssc_token)
        h_logout.do_POST()
        self.assertEqual(h_logout.response_status, 200)
        print("✓ Tab 2 Logged out successfully")

        # 7. TAB 2 Status check -> Expect 401 Unauthorized for ssc_token
        h2_after = MockSSCHandler('/api/auth/me', method='GET', session_token=ssc_token)
        h2_after.do_GET()
        self.assertEqual(h2_after.response_status, 401)
        print("✓ Tab 2 session revoked (401 Unauthorized)")

        # 8. TAB 1 RE-CHECK: Tab 1 must remain 100% active as Academic Head!
        h1_after = MockSSCHandler('/api/auth/me', method='GET', session_token=head_token)
        h1_after.do_GET()
        self.assertEqual(h1_after.response_status, 200)
        u1_still = json.loads(h1_after.wfile.getvalue().decode('utf-8'))['user']
        self.assertEqual(u1_still['email'], 'head@mashmagic.com')
        print("✓ Tab 1 Academic Head session remains 100% ACTIVE and unaffected by Tab 2 logout!")

if __name__ == '__main__':
    unittest.main()
