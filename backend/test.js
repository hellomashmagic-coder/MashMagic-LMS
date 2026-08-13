require('dotenv').config({path: './.env'});
const db = require('./config/db');

async function test() { 
    try { 
        const [rows] = await db.query("SELECT id, status, minutes_locked FROM faculty_sessions WHERE status = 'Scheduled' AND minutes_locked = 1");
        console.log('Zombie sessions:', rows); 
    } catch(e) { 
        console.error(e); 
    } finally { 
        process.exit(); 
    } 
} 
test();
