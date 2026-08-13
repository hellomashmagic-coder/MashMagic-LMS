const db = require('./config/db');

async function test() {
    try {
        const [users] = await db.query("SELECT id, name, role FROM users WHERE name LIKE '%Fasila%' OR name LIKE '%Mary Saniya%' OR name LIKE '%Honey P S%' OR name LIKE '%Shabeera%'");
        console.log("Users:", users);

        const [faculties] = await db.query("SELECT id, name FROM faculties WHERE name LIKE '%Fasila%' OR name LIKE '%Mary Saniya%' OR name LIKE '%Honey P S%' OR name LIKE '%Shabeera%'");
        console.log("Faculties:", faculties);

        process.exit(0);
    } catch(e) {
        console.log(e);
        process.exit(1);
    }
}
test();
