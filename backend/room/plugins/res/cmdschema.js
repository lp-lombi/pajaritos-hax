module.exports = (dbPath) => {
    return new Promise((resolve, reject) => {
        const sqlite3 = require("sqlite3");
        const db = new sqlite3.Database(dbPath);
        db.serialize(
            () => {
                db.run(
                    `CREATE TABLE IF NOT EXISTS "announcements" ("id" INTEGER NOT NULL, "text" INTEGER, PRIMARY KEY("id" AUTOINCREMENT))`
                );
                db.run(
                    `CREATE TABLE IF NOT EXISTS "bans" ("id" INTEGER NOT NULL, "name" TEXT, "ip" TEXT, "auth" TEXT, PRIMARY KEY("id" AUTOINCREMENT))`
                );
                db.run(
                    `CREATE TABLE IF NOT EXISTS "kits" ("id" INTEGER NOT NULL, "name" TEXT, "cfg" TEXT, PRIMARY KEY("id" AUTOINCREMENT))`
                );
            },
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(db);
                }
            }
        );

        /* CREATE TABLE "announcements" ("id" INTEGER NOT NULL, "text" INTEGER, PRIMARY KEY("id" AUTOINCREMENT)) */
        /* CREATE TABLE "bans" ("id" INTEGER NOT NULL, "name" TEXT, "ip" TEXT, "auth" TEXT, PRIMARY KEY("id" AUTOINCREMENT)) */
        /* CREATE TABLE "kits" ("id" INTEGER NOT NULL, "name" TEXT, "cfg" TEXT, PRIMARY KEY("id" AUTOINCREMENT)) */
        /*  */
    });
};
