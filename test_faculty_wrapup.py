import urllib.request
import json
import sys

BASE_URL = 'http://127.0.0.1:8000'

def request(path, method='GET', data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['X-Session-ID'] = token

    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = resp.read().decode('utf-8')
            return resp.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(res_body)
        except Exception:
            return e.code, {'error': res_body}

def run_tests():
    print("=== STARTING FACULTY SESSION WRAP-UP AUTOMATED VERIFICATION ===")
    
    # 1. Login as SSC
    status, login_ssc = request('/api/auth/login', 'POST', {'email': 'ananya@mashmagic.com', 'password': 'ssc123'})
    assert status == 200 and login_ssc['success'] is True
    ssc_token = login_ssc['token']
    print("✅ Authenticated as SSC Ananya.")

    # 2. Schedule a Class Occurrence and verify unique wrapup_token generation
    class_payload = {
        'student_id': 2,
        'faculty_id': 1,
        'subject': 'Mathematics',
        'date': '2026-09-16',
        'start_time': '04:00 PM',
        'duration': 60,
        'notes': 'Test wrapup workflow class'
    }
    status, create_res = request('/api/classes', 'POST', class_payload, token=ssc_token)
    assert status == 200 and create_res['success'] is True
    class_id = create_res['class_id']
    wrapup_token = create_res['wrapup_token']
    assert wrapup_token is not None and len(wrapup_token) > 10
    print(f"✅ Step 1 Passed: Scheduled class (ID: {class_id}) with unique Wrap-up Token: {wrapup_token}")

    # 3. Public Wrap-Up Link Lookup (No Auth required)
    status, pub_res = request(f'/api/session-wrapup/{wrapup_token}', 'GET')
    assert status == 200 and pub_res['success'] is True
    sess = pub_res['session']
    print(f"DEBUG SESS: {sess}")
    assert 'student_name' in sess
    assert sess['subject'] == 'Mathematics'
    assert sess['faculty_name'] == 'Rahul Verma'
    assert sess['wrapup_status'] == 'PENDING'
    print(f"✅ Step 2 Passed: Public session lookup returned correct details for {sess['student_name']} - {sess['subject']}.")

    # 4. Faculty Submits Wrap-Up Report (Public, 16:05 to 17:02 -> Calculated 57 mins)
    wrapup_data = {
        'session_status': 'Completed',
        'actual_start_time': '16:05',
        'actual_end_time': '17:02',
        'topic_covered': 'Quadratic equations – factorisation method',
        'homework': 'Exercise 4.2 questions 1-5',
        'homework_given': 'Yes',
        'student_performance': 'Good',
        'faculty_remarks': 'Student understood factorisation concept well.',
        'next_session_rec': 'Practice questions 6-10'
    }
    status, submit_res = request(f'/api/session-wrapup/{wrapup_token}', 'POST', wrapup_data)
    assert status == 200 and submit_res['success'] is True
    assert submit_res['calculated_minutes'] == 57
    assert submit_res['wrapup_status'] == 'SUBMITTED'
    print("✅ Step 3 Passed: Faculty submitted wrap-up. System calculated actual duration = 57 minutes.")

    # 5. SSC Checks Pending Queue
    status, pending_res = request('/api/wrapups/pending', 'GET', token=ssc_token)
    assert status == 200 and pending_res['success'] is True
    pending_list = pending_res['pending_wrapups']
    assert any(c['id'] == class_id for c in pending_list)
    print("✅ Step 4 Passed: Session report appears in SSC Pending Verification Queue.")

    # 6. SSC Sends Back to Faculty for Correction
    sendback_payload = {
        'action': 'SEND_BACK',
        'correction_reason': 'Please add extra practice homework details'
    }
    status, sb_res = request(f'/api/classes/{class_id}/verify-wrapup', 'POST', sendback_payload, token=ssc_token)
    assert status == 200 and sb_res['wrapup_status'] == 'CORRECTION_REQUIRED'
    
    # Verify public link shows CORRECTION_REQUIRED
    status, pub_corr = request(f'/api/session-wrapup/{wrapup_token}', 'GET')
    assert pub_corr['session']['wrapup_status'] == 'CORRECTION_REQUIRED'
    assert pub_corr['session']['correction_reason'] == 'Please add extra practice homework details'
    print("✅ Step 5 Passed: SSC sent back report to faculty with correction reason.")

    # 7. Faculty Re-submits Corrected Wrap-Up Report
    wrapup_data['homework'] = 'Exercise 4.2 questions 1-10 (Updated)'
    status, resubmit_res = request(f'/api/session-wrapup/{wrapup_token}', 'POST', wrapup_data)
    assert status == 200 and resubmit_res['wrapup_status'] == 'SUBMITTED'
    print("✅ Step 6 Passed: Faculty updated and re-submitted wrap-up report.")

    # 8. SSC Approves & Finalizes Session
    approve_payload = {
        'action': 'APPROVE',
        'attendance': 'Present',
        'final_minutes': 57,
        'ssc_remarks': 'Verified and approved by SSC Ananya'
    }
    status, app_res = request(f'/api/classes/{class_id}/verify-wrapup', 'POST', approve_payload, token=ssc_token)
    assert status == 200 and app_res['wrapup_status'] == 'VERIFIED'
    assert app_res['final_minutes'] == 57
    print("✅ Step 7 Passed: SSC verified and finalized session with 57 official class minutes.")

    # 9. Verify Student History & Timeline
    status, std_res = request('/api/students/2', 'GET', token=ssc_token)
    assert status == 200
    student = std_res['student']
    
    timeline_desc = [t['description'] for t in student['timeline']]
    assert any('Session wrap-up report submitted by' in d for d in timeline_desc)
    assert any('Session verified by SSC' in d for d in timeline_desc)
    print("✅ Step 8 Passed: Student timeline updated with wrap-up submission & verification audit logs.")

    print("\n🎉 ALL FACULTY SESSION WRAP-UP INTEGRATION TESTS PASSED PERFECTLY! 🎉")

if __name__ == '__main__':
    run_tests()
