require('dotenv').config({path: './.env'});
const db = require('./config/db');

async function fixZombies() { 
    try { 
        const [result] = await db.query("UPDATE faculty_sessions SET minutes_locked = 0 WHERE status = 'Scheduled' AND minutes_locked = 1");
        console.log('Fixed zombie sessions:', result.affectedRows); 
    } catch(e) { 
        console.error(e); 
    } finally { 
        process.exit(); 
    } 
} 
fixZombies();
