const pool = require('../config/db');

const renameTables = async () => {
    try {
        console.log("Starting table rename...");

        // Rename tables if they exist
        await pool.query(`RENAME TABLE aoe_faculty_quality TO ah_faculty_quality;`).catch(e => console.log(e.message));
        await pool.query(`RENAME TABLE aoe_faculty_replacements TO ah_faculty_replacements;`).catch(e => console.log(e.message));
        await pool.query(`RENAME TABLE aoe_escalations TO ah_escalations;`).catch(e => console.log(e.message));

        console.log("Table rename complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error renaming tables:", error);
        process.exit(1);
    }
};

renameTables();
