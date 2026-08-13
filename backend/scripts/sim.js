const studentData = { subjects: { 'Mathematics': { allocated: 0, consumedMins: 0 }, 'Physics': { allocated: 12, consumedMins: 180 } } };
const s = { id: 488, subjects_json: '["PHYSICS"]', subject: 'PHYSICS' };

let actualSubjects = [];
const trackedSubjects = Object.keys(studentData.subjects);

if (trackedSubjects.length > 0) {
    actualSubjects = trackedSubjects;
} else {
    let registeredSubjects = [];
    try {
        if (s.subjects_json) {
            registeredSubjects = typeof s.subjects_json === 'string' ? JSON.parse(s.subjects_json) : s.subjects_json;
        }
    } catch(e) {}

    if (registeredSubjects.length > 0) {
        actualSubjects = registeredSubjects.map(sub => {
            if (typeof sub === 'string') return sub;
            if (sub.subject && typeof sub.subject === 'string') return sub.subject;
            if (sub.subject && Array.isArray(sub.subject)) return sub.subject.join(', ');
            return null;
        }).filter(Boolean);
    } else if (s.subject) {
        actualSubjects = s.subject.split(',').map(sub => sub.trim()).filter(Boolean);
    }
}

actualSubjects = [...new Set(actualSubjects)];
console.log("actualSubjects:", actualSubjects);
