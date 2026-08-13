const mysql = require('mysql2/promise');

async function tryConnect(config, label) {
    try {
        const conn = await mysql.createConnection(config);
        const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM students');
        console.log(`[OK] ${label}: students count = ${rows[0].cnt}`);
        await conn.end();
        return conn;
    } catch (e) {
        console.log(`[FAIL] ${label}: ${e.message}`);
        return null;
    }
}

async function run() {
    // Try multiple connection configs
    await tryConnect({ host: '127.0.0.1', port: 3306, user: 'root', password: 'MashMagic2026!', database: 'mashmagic' }, '127.0.0.1:3306 root/MashMagic2026!');
    await tryConnect({ host: 'localhost', port: 3306, user: 'root', password: 'MashMagic2026!', database: 'mashmagic' }, 'localhost:3306 root/MashMagic2026!');
    await tryConnect({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'mashmagic' }, '127.0.0.1:3306 root/[empty]');
    await tryConnect({ host: '127.0.0.1', port: 3306, user: 'root', password: 'root', database: 'mashmagic' }, '127.0.0.1:3306 root/root');
    await tryConnect({ host: '127.0.0.1', port: 3307, user: 'root', password: 'MashMagic2026!', database: 'mashmagic' }, '127.0.0.1:3307 root/MashMagic2026!');
    process.exit(0);
}
run();
