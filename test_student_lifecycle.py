import urllib.request
import json

BASE_URL = 'http://127.0.0.1:8000'

def request(path, method='GET', data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['X-Session-ID'] = token

    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    with urllib.request.urlopen(req) as resp:
        res_body = resp.read().decode('utf-8')
        return json.loads(res_body)

def run_tests():
    print("=== STARTING STUDENT LIFECYCLE AUTOMATED VERIFICATION ===")
    
    # 1. Login as Academic Head
    login_res = request('/api/auth/login', 'POST', {'email': 'head@mashmagic.com', 'password': 'admin123'})
    assert login_res['success'] is True
    token = login_res['token']
    print("✅ Authenticated as Academic Head.")

    # 2. Scenario 1: Registration with Auto Register Number & Preferred Language
    reg_data = {
        'name': 'Aarav Test Student',
        'grade': 'Grade 8',
        'board': 'CBSE',
        'school': 'Choice School',
        'preferred_language': 'More English, Less Malayalam',
        'parent_name': 'Rajesh Patel',
        'parent_phone': '+919876543210',
        'student_phone': '+919876543211',
        'program': 'Classmate 1-on-1',
        'session_package': 24,
        'assigned_ssc_id': 1,
        'subjects': [
            {'subject': 'Mathematics', 'faculty_id': 1},
            {'subject': 'Science', 'faculty_id': 2}
        ]
    }
    
    reg_res = request('/api/students', 'POST', reg_data, token=token)
    assert reg_res['success'] is True
    student_id = reg_res['student_id']
    register_no = reg_res['register_no']
    assert register_no.startswith('MM-2026-')
    print(f"✅ Scenario 1 Passed: Student registered with Auto Register No: {register_no}")

    # 3. Scenario 2: Multi-Subject & Faculty Contact Retrieval
    detail_res = request(f'/api/students/{student_id}', 'GET', token=token)
    student = detail_res['student']
    assert student['register_no'] == register_no
    assert student['preferred_language'] == 'More English, Less Malayalam'
    assert len(student['subjects_detail']) == 2
    assert student['subjects_detail'][0]['faculty_phone'] is not None
    print(f"✅ Scenario 2 Passed: Retrieved multi-subjects & faculty phone: {student['subjects_detail'][0]['faculty_phone']}")

    # 4. Scenario 3: Mark Course Completed
    complete_res = request(f'/api/students/{student_id}/mark-completed', 'POST', {}, token=token)
    assert complete_res['success'] is True
    detail_res = request(f'/api/students/{student_id}', 'GET', token=token)
    assert detail_res['student']['status'] == 'Course Completed'
    print("✅ Scenario 3 Passed: Student status updated to 'Course Completed'.")

    # 5. Scenario 4: Add New Package
    pkg_data = {
        'program': 'Magic Mentor',
        'session_package': 36,
        'notes': 'Advanced package upgrade',
        'subjects': [
            {'subject': 'Physics', 'faculty_id': 3}
        ]
    }
    pkg_res = request(f'/api/students/{student_id}/add-package', 'POST', pkg_data, token=token)
    assert pkg_res['success'] is True
    detail_res = request(f'/api/students/{student_id}', 'GET', token=token)
    student = detail_res['student']
    assert student['status'] == 'Active'
    assert student['program'] == 'Magic Mentor'
    assert student['session_package'] == 36
    assert len(student['packages']) == 2
    print(f"✅ Scenario 4 Passed: Added new package. Total packages: {len(student['packages'])}")

    # 6. Scenario 5: Archive Student
    archive_res = request(f'/api/students/{student_id}/archive', 'POST', {}, token=token)
    assert archive_res['success'] is True
    detail_res = request(f'/api/students/{student_id}', 'GET', token=token)
    student = detail_res['student']
    assert student['status'] == 'Archived'
    assert student['assigned_ssc_id'] is None
    print("✅ Scenario 5 Passed: Student archived and SSC unassigned.")

    # 7. Scenario 6: Restore Student
    restore_res = request(f'/api/students/{student_id}/restore', 'POST', {'assigned_ssc_id': 1}, token=token)
    assert restore_res['success'] is True
    detail_res = request(f'/api/students/{student_id}', 'GET', token=token)
    student = detail_res['student']
    assert student['status'] == 'Active'
    assert student['assigned_ssc_id'] == 1
    print("✅ Scenario 6 Passed: Student restored to Active status.")

    print("\n🎉 ALL 6 LIFECYCLE TEST SCENARIOS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
