const express = require('express');
const router = express.Router();
const {
    registerStudent,
    registerMentor,
    registerFaculty,
    getMentors,
    getFaculties
} = require('../controllers/registrationController');

// All public routes (no auth required)
router.post('/student', registerStudent);
router.post('/mentor', registerMentor);
router.post('/faculty', registerFaculty);
router.get('/mentors', getMentors);
router.get('/faculties', getFaculties);

module.exports = router;
