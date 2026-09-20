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
    print("=== STARTING FACULTY MANAGEMENT AUTOMATED VERIFICATION ===")
    
    # 1. Login as Academic Head and SSC
    status, login_head = request('/api/auth/login', 'POST', {'email': 'head@mashmagic.com', 'password': 'admin123'})
    assert status == 200 and login_head['success'] is True
    head_token = login_head['token']
    print("✅ Authenticated as Academic Head.")

    status, login_ssc = request('/api/auth/login', 'POST', {'email': 'ananya@mashmagic.com', 'password': 'ssc123'})
    assert status == 200 and login_ssc['success'] is True
    ssc_token = login_ssc['token']
    print("✅ Authenticated as SSC.")

    # 2. TEST 1: Register new faculty as Academic Head
    new_faculty_data = {
        'name': 'Dr. Neha Test Faculty',
        'phone': '+919876500001',
        'email': 'neha.test@mashmagic.com',
        'subjects': ['Physics', 'Mathematics'],
        'syllabuses': ['CBSE', 'ICSE'],
        'grades': ['Grade 11', 'Grade 12'],
        'status': 'Active'
    }
    status, fac_res = request('/api/faculty', 'POST', new_faculty_data, token=head_token)
    assert status == 200 and fac_res['success'] is True, f"Failed: {fac_res}"
    faculty_id = fac_res['faculty_id']
    faculty_code = fac_res['faculty_code']
    assert faculty_code.startswith('FAC-2026-')
    print(f"✅ Test 1 Passed: Faculty created with auto code {faculty_code} (ID: {faculty_id})")

    # 3. TEST 2: Register student assigned to Test Faculty & verify single source contact
    reg_student = {
        'name': 'Rohan Faculty Test Student',
        'grade': 'Grade 11',
        'board': 'CBSE',
        'school': 'National Public School',
        'preferred_language': 'English',
        'parent_name': 'Suresh Patel',
        'parent_phone': '+919800011122',
        'student_phone': '+919800011123',
        'program': 'Classmate 1-on-1',
        'session_package': 24,
        'assigned_ssc_id': 1,
        'subjects': [
            {'subject': 'Physics', 'faculty_id': faculty_id}
        ]
    }
    status, std_res = request('/api/students', 'POST', reg_student, token=head_token)
    assert status == 200 and std_res['success'] is True
    student_id = std_res['student_id']

    status, std_detail = request(f'/api/students/{student_id}', 'GET', token=head_token)
    student = std_detail['student']
    assert len(student['subjects_detail']) == 1
    assert student['subjects_detail'][0]['faculty_phone'] == '+919876500001'
    print(f"✅ Test 2 Passed: Student registered with subject assigned to {faculty_code}, contact auto-matched +919876500001.")

    # 4. TEST 3: Edit Faculty phone number & verify instant single source update across student record
    update_data = {
        'name': 'Dr. Neha Test Faculty',
        'phone': '+919876599999',
        'email': 'neha.test@mashmagic.com',
        'subjects': ['Physics', 'Mathematics'],
        'syllabuses': ['CBSE', 'ICSE'],
        'grades': ['Grade 11', 'Grade 12'],
        'status': 'Active'
    }
    status, edit_res = request(f'/api/faculty/{faculty_id}', 'PUT', update_data, token=head_token)
    assert status == 200 and edit_res['success'] is True

    status, std_detail_updated = request(f'/api/students/{student_id}', 'GET', token=head_token)
    student_updated = std_detail_updated['student']
    assert student_updated['subjects_detail'][0]['faculty_phone'] == '+919876599999'
    print("✅ Test 3 Passed: Updated faculty phone to +919876599999. Verified instant update in student detail.")

    # 5. TEST 4: Mark Faculty Inactive & verify active_only dropdown filtering vs directory list
    inact_data = dict(update_data)
    inact_data['status'] = 'Inactive'
    status, inact_res = request(f'/api/faculty/{faculty_id}', 'PUT', inact_data, token=head_token)
    assert status == 200 and inact_res['success'] is True

    status, all_fac = request('/api/faculty', 'GET', token=head_token)
    assert any(f['id'] == faculty_id for f in all_fac['faculty'])
    
    status, active_fac = request('/api/faculty?active_only=true', 'GET', token=head_token)
    assert not any(f['id'] == faculty_id for f in active_fac['faculty'])
    print("✅ Test 4 Passed: Inactive faculty retained in directory list but filtered from active_only dropdown list.")

    # 6. TEST 5: Verify SSC role permissions (Read-only lookup allowed, Create/Edit forbidden)
    status, ssc_view = request('/api/faculty', 'GET', token=ssc_token)
    assert status == 200 and 'faculty' in ssc_view
    status, ssc_detail = request(f'/api/faculty/{faculty_id}', 'GET', token=ssc_token)
    assert status == 200 and 'faculty' in ssc_detail
    print("✅ SSC read-only access verified.")

    status, ssc_create = request('/api/faculty', 'POST', new_faculty_data, token=ssc_token)
    assert status == 403
    status, ssc_edit = request(f'/api/faculty/{faculty_id}', 'PUT', update_data, token=ssc_token)
    assert status == 403
    print("✅ Test 5 Passed: SSC write operations properly blocked with 403 Forbidden.")

    print("\n🎉 ALL FACULTY MANAGEMENT INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉")

if __name__ == '__main__':
    run_tests()
