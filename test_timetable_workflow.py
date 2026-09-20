import os
import unittest
import json
from io import BytesIO
from datetime import date
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

def login_user(email, password):
    handler = MockSSCHandler('/api/auth/login', method='POST', body_data={'email': email, 'password': password})
    handler.do_POST()
    assert handler.response_status == 200, f"Login failed for {email}"
    cookie_header = handler.response_headers.get('Set-Cookie', '')
    return cookie_header.split('session_id=')[1].split(';')[0]

class TestTimetableAndStudentHistoryWorkflow(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db_file = database.DB_FILE
        if os.path.exists(db_file):
            os.remove(db_file)
        database.init_db()
        database.seed_data()

    def test_section_27_workflow(self):
        print("\n==================================================")
        print("Executing Section 27 Complete Workflow Test")
        print("==================================================")

        # 1. Login as SSC Ananya Sharma (assigned to Ayaan Sharma, ID: 1)
        ssc_session = login_user('ananya@mashmagic.com', 'ssc123')
        print("✓ Logged in as SSC Ananya Sharma")

        # 2. Set Weekly Timetable slots for Ayaan Sharma (Student 1)
        wt_slots = [
            {'student_id': 1, 'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Monday', 'start_time': '04:00 PM', 'duration': 60, 'effective_from': '2026-09-01'},
            {'student_id': 1, 'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Wednesday', 'start_time': '04:00 PM', 'duration': 60, 'effective_from': '2026-09-01'},
            {'student_id': 1, 'subject': 'Science', 'faculty_id': 2, 'day_of_week': 'Tuesday', 'start_time': '05:00 PM', 'duration': 60, 'effective_from': '2026-09-01'},
            {'student_id': 1, 'subject': 'Science', 'faculty_id': 2, 'day_of_week': 'Thursday', 'start_time': '05:00 PM', 'duration': 60, 'effective_from': '2026-09-01'}
        ]

        for slot in wt_slots:
            h = MockSSCHandler('/api/weekly-timetable', method='POST', body_data=slot, session_id=ssc_session)
            h.do_POST()
            self.assertEqual(h.response_status, 200)

        print("✓ Set weekly timetable: Mon 4PM Math, Wed 4PM Math, Tue 5PM Science, Thu 5PM Science")

        # 3. Generate & Verify September 2026 Monthly Calendar
        h_cal = MockSSCHandler('/api/calendar?year=2026&month=9&student_id=1', method='GET', session_id=ssc_session)
        h_cal.do_GET()
        self.assertEqual(h_cal.response_status, 200)
        cal_data = json.loads(h_cal.wfile.getvalue().decode('utf-8'))
        classes = cal_data['classes']

        math_mon_dates = [c['date'] for c in classes if c['subject'] == 'Mathematics' and c['date'].endswith(('-07', '-14', '-21', '-28'))]
        self.assertEqual(len(math_mon_dates), 4, f"Expected 4 Monday Math classes in September, found {math_mon_dates}")
        print("✓ Generated September calendar & verified all weekly occurrences appear (Sep 7, 14, 21, 28)")

        # 4. Find Sep 21 Mathematics 4:00 PM class occurrence and reschedule it
        sep_21_math = None
        for c in classes:
            if c['subject'] == 'Mathematics' and c['date'] == '2026-09-21' and c['start_time'] == '04:00 PM':
                sep_21_math = c
                break
        self.assertIsNotNone(sep_21_math, "Sep 21 Mathematics 4 PM class occurrence should exist")

        reschedule_body = {
            'suggested_date': '2026-09-21',
            'suggested_time': '06:00 PM',
            'faculty_id': 1,
            'requested_by': 'Parent',
            'reason': 'Student unavailable at 4 PM due to dentist appointment'
        }
        h_resched = MockSSCHandler(f"/api/classes/{sep_21_math['id']}/reschedule", method='POST', body_data=reschedule_body, session_id=ssc_session)
        h_resched.do_POST()
        self.assertEqual(h_resched.response_status, 200)
        print("✓ Rescheduled Sep 21 Mathematics 4:00 PM -> 6:00 PM (Requested by Parent)")

        # Verify Sep 21 original occurrence status is RESCHEDULED
        h_cal2 = MockSSCHandler('/api/calendar?year=2026&month=9&student_id=1', method='GET', session_id=ssc_session)
        h_cal2.do_GET()
        classes2 = json.loads(h_cal2.wfile.getvalue().decode('utf-8'))['classes']

        sep_21_orig = [c for c in classes2 if c['id'] == sep_21_math['id']][0]
        self.assertEqual(sep_21_orig['status'].upper(), 'RESCHEDULED')

        sep_21_new = [c for c in classes2 if c['date'] == '2026-09-21' and c['start_time'] == '06:00 PM'][0]
        self.assertIsNotNone(sep_21_new)
        print(f"✓ Verified Sep 21 original class status = RESCHEDULED and new class created at 6:00 PM (ID: {sep_21_new['id']})")

        # 5. Verify Master Weekly Timetable remains Monday 4 PM & Sep 28 Math remains at 4 PM
        h_wt = MockSSCHandler('/api/weekly-timetable?student_id=1', method='GET', session_id=ssc_session)
        h_wt.do_GET()
        wt_list = json.loads(h_wt.wfile.getvalue().decode('utf-8'))['weekly_timetable']
        mon_wt = [w for w in wt_list if w['day_of_week'] == 'Monday' and w['subject'] == 'Mathematics'][0]
        self.assertEqual(mon_wt['start_time'], '04:00 PM')

        sep_28_math = [c for c in classes2 if c['subject'] == 'Mathematics' and c['date'] == '2026-09-28'][0]
        self.assertEqual(sep_28_math['start_time'], '04:00 PM')
        print("✓ Verified Master Weekly Timetable remains Monday 4:00 PM & Sep 28 Math class automatically remains at 4:00 PM!")

        # 6. Cancel Sep 23 Mathematics class
        sep_23_math = [c for c in classes2 if c['subject'] == 'Mathematics' and c['date'] == '2026-09-23'][0]
        cancel_body = {
            'requested_by': 'Faculty',
            'reason': 'Faculty unwell'
        }
        h_cancel = MockSSCHandler(f"/api/classes/{sep_23_math['id']}/cancel", method='POST', body_data=cancel_body, session_id=ssc_session)
        h_cancel.do_POST()
        self.assertEqual(h_cancel.response_status, 200)

        # Verify Sep 23 class remains visible as CANCELLED
        h_cal3 = MockSSCHandler('/api/calendar?year=2026&month=9&student_id=1', method='GET', session_id=ssc_session)
        h_cal3.do_GET()
        classes3 = json.loads(h_cal3.wfile.getvalue().decode('utf-8'))['classes']
        sep_23_cancelled = [c for c in classes3 if c['id'] == sep_23_math['id']][0]
        self.assertEqual(sep_23_cancelled['status'].upper(), 'CANCELLED')
        self.assertEqual(sep_23_cancelled['cancellation_reason'], 'Faculty unwell')
        print("✓ Cancelled Sep 23 Mathematics class & verified it remains visible in calendar as CANCELLED with reason")

        # 7. Verify Student Profile & Complete Journey Timeline for Ayaan Sharma
        h_profile = MockSSCHandler('/api/students/1', method='GET', session_id=ssc_session)
        h_profile.do_GET()
        self.assertEqual(h_profile.response_status, 200)
        profile = json.loads(h_profile.wfile.getvalue().decode('utf-8'))['student']

        self.assertEqual(profile['register_no'], 'MM-2026-0001')
        self.assertGreater(len(profile['weekly_timetable']), 0)
        self.assertIn('class_summary', profile)
        self.assertGreater(profile['class_summary']['cancelled'], 0)
        self.assertGreater(profile['class_summary']['rescheduled'], 0)
        
        timeline_events = [t['activity_type'] for t in profile['timeline']]
        print("\nStudent Journey Timeline Events:")
        for t in profile['timeline'][:10]:
            print(f"  - [{t['created_at']}] {t['activity_type']}: {t['description']}")

        self.assertIn('Class Rescheduled', timeline_events)
        self.assertIn('Class Cancelled', timeline_events)
        self.assertIn('Timetable Created', timeline_events)

        print("\n==================================================")
        print("ALL SECTION 27 WORKFLOW VERIFICATION CHECKS PASSED PERFECTLY!")
        print("==================================================")

    def test_student_level_multi_subject_bulk_setup_and_conflicts(self):
        print("\n==================================================")
        print("Executing Multi-Subject Bulk Timetable & Conflict Test")
        print("==================================================")

        ssc_session = login_user('ananya@mashmagic.com', 'ssc123')

        # 1. Bulk Save 4 Slots across Mathematics & Science for Student 1 (Ayaan Sharma)
        bulk_payload = {
            'student_id': 1,
            'effective_from': '2026-09-01',
            'slots': [
                {'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Monday', 'start_time': '04:00 PM', 'duration': 60, 'meeting_link': 'https://meet.google.com/math1'},
                {'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Wednesday', 'start_time': '04:00 PM', 'duration': 60, 'meeting_link': 'https://meet.google.com/math2'},
                {'subject': 'Science', 'faculty_id': 2, 'day_of_week': 'Tuesday', 'start_time': '05:00 PM', 'duration': 60, 'meeting_link': 'https://meet.google.com/sci1'},
                {'subject': 'Science', 'faculty_id': 2, 'day_of_week': 'Thursday', 'start_time': '05:00 PM', 'duration': 60, 'meeting_link': 'https://meet.google.com/sci2'}
            ]
        }
        h_bulk = MockSSCHandler('/api/weekly-timetable/bulk', method='POST', body_data=bulk_payload, session_id=ssc_session)
        h_bulk.do_POST()
        self.assertEqual(h_bulk.response_status, 200)
        res_bulk = json.loads(h_bulk.wfile.getvalue().decode('utf-8'))
        self.assertTrue(res_bulk['success'])
        self.assertEqual(res_bulk['saved_slots_count'], 4)
        print("✓ Saved 4 slots across 2 subjects in ONE atomic request for Student 1")

        # 2. Test Student Internal Overlap Conflict Rejection
        conflict_student_payload = {
            'student_id': 1,
            'effective_from': '2026-09-01',
            'slots': [
                {'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Monday', 'start_time': '04:00 PM', 'duration': 60},
                {'subject': 'Science', 'faculty_id': 2, 'day_of_week': 'Monday', 'start_time': '04:30 PM', 'duration': 60}  # Overlaps 4:00-5:00 PM
            ]
        }
        h_conf_st = MockSSCHandler('/api/weekly-timetable/bulk', method='POST', body_data=conflict_student_payload, session_id=ssc_session)
        h_conf_st.do_POST()
        self.assertEqual(h_conf_st.response_status, 400)
        res_conf_st = json.loads(h_conf_st.wfile.getvalue().decode('utf-8'))
        self.assertIn("Student Schedule Conflict", res_conf_st['error'])
        print(f"✓ Rejected student schedule overlap correctly: {res_conf_st['error']}")

        # 3. Test Faculty Overlap Conflict Rejection against Student 1
        # Faculty 1 (Rahul Verma) is teaching Student 1 on Mon 4:00 PM - 5:00 PM. Attempt to assign Faculty 1 to Student 2 on Mon 4:30 PM.
        conflict_faculty_payload = {
            'student_id': 2,
            'effective_from': '2026-09-01',
            'slots': [
                {'subject': 'Mathematics', 'faculty_id': 1, 'day_of_week': 'Monday', 'start_time': '04:30 PM', 'duration': 60}
            ]
        }
        h_conf_fac = MockSSCHandler('/api/weekly-timetable/bulk', method='POST', body_data=conflict_faculty_payload, session_id=ssc_session)
        h_conf_fac.do_POST()
        self.assertEqual(h_conf_fac.response_status, 400)
        res_conf_fac = json.loads(h_conf_fac.wfile.getvalue().decode('utf-8'))
        self.assertIn("Faculty Schedule Conflict", res_conf_fac['error'])
        print(f"✓ Rejected faculty schedule overlap correctly: {res_conf_fac['error']}")

        # 4. Verify Student Profile reflects the saved 4-slot weekly timetable
        h_profile = MockSSCHandler('/api/students/1', method='GET', session_id=ssc_session)
        h_profile.do_GET()
        self.assertEqual(h_profile.response_status, 200)
        profile = json.loads(h_profile.wfile.getvalue().decode('utf-8'))['student']
        self.assertEqual(len(profile['weekly_timetable']), 4)
        print("✓ Verified Student Profile drawer loads complete multi-subject weekly timetable")

    def test_monthly_class_calendar_page_and_scoping(self):
        print("\n==================================================")
        print("Executing Monthly Class Calendar & Scoping Test")
        print("==================================================")

        # 1. Login as SSC Ananya Sharma
        ssc_session = login_user('ananya@mashmagic.com', 'ssc123')

        # 2. Fetch Monthly Calendar Data for September 2026
        h_cal = MockSSCHandler('/api/calendar?year=2026&month=9', method='GET', session_id=ssc_session)
        h_cal.do_GET()
        self.assertEqual(h_cal.response_status, 200)
        cal_res = json.loads(h_cal.wfile.getvalue().decode('utf-8'))

        summary = cal_res['summary']
        classes = cal_res['classes']
        assigned_students = cal_res['assigned_students']
        faculty_list = cal_res['faculty']

        self.assertGreater(summary['total_students'], 0)
        self.assertGreater(summary['total_classes'], 0)
        self.assertIn('conducted', summary)
        self.assertIn('upcoming', summary)
        self.assertIn('exceptions', summary)
        print(f"✓ Summary Metrics for SSC Ananya: Total Students: {summary['total_students']}, Total Classes: {summary['total_classes']}, Conducted: {summary['conducted']}, Upcoming: {summary['upcoming']}, Exceptions: {summary['exceptions']}")

        # 3. Verify SSC Scoping: All classes belong to Ananya's assigned students (Student IDs <= 24)
        ssc_student_ids = {st['id'] for st in assigned_students}
        for c in classes:
            self.assertIn(c['student_id'], ssc_student_ids, f"Class {c['id']} belongs to student {c['student_id']} not assigned to SSC Ananya!")
        print("✓ Verified SSC Scoping: 100% of calendar classes belong to SSC Ananya's assigned students")

        # 4. Verify Status Filtering (Filter by CANCELLED)
        h_canc = MockSSCHandler('/api/calendar?year=2026&month=9&status=CANCELLED', method='GET', session_id=ssc_session)
        h_canc.do_GET()
        self.assertEqual(h_canc.response_status, 200)
        canc_classes = json.loads(h_canc.wfile.getvalue().decode('utf-8'))['classes']
        for c in canc_classes:
            self.assertEqual(c['status'].upper(), 'CANCELLED')
        print(f"✓ Verified Status Filter (CANCELLED): returned {len(canc_classes)} cancelled class occurrence(s)")

        # 5. Verify Academic Head Scope (Head sees all students across organization)
        head_session = login_user('head@mashmagic.com', 'admin123')
        h_head_cal = MockSSCHandler('/api/calendar?year=2026&month=9', method='GET', session_id=head_session)
        h_head_cal.do_GET()
        self.assertEqual(h_head_cal.response_status, 200)
        head_cal_res = json.loads(h_head_cal.wfile.getvalue().decode('utf-8'))
        head_summary = head_cal_res['summary']
        self.assertGreater(head_summary['total_students'], summary['total_students'])
        print(f"✓ Verified Academic Head Scope: Total Students: {head_summary['total_students']} (larger than single SSC scope)")

if __name__ == '__main__':
    unittest.main()
