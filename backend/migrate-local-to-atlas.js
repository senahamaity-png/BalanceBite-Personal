const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { EJSON } = require("bson");

const LOCAL_URI = "mongodb://127.0.0.1:27017/BalanceBitePersonal";
const ATLAS_URI = process.env.BB_ATLAS_URI;

async function main() {
  if (!ATLAS_URI || !ATLAS_URI.startsWith("mongodb+srv://")) {
    throw new Error("Atlas URI missing or invalid.");
  }

  let local;
  let atlas;
  let session;

  try {
    local = await mongoose.createConnection(LOCAL_URI).asPromise();
    atlas = await mongoose.createConnection(ATLAS_URI).asPromise();

    if (local.name !== "BalanceBitePersonal" ||
        atlas.name !== "BalanceBitePersonal") {
      throw new Error("Database name mismatch. Migration stopped.");
    }

    const localCollections = await local.db.listCollections().toArray();
    const atlasCollections = await atlas.db.listCollections().toArray();

    for (const item of atlasCollections) {
      const count = await atlas.db.collection(item.name).countDocuments();
      if (count > 0) {
        throw new Error(
          "Atlas collection " + item.name +
          " already contains data. Migration stopped."
        );
      }
    }

    const backup = {};

    for (const item of localCollections) {
      backup[item.name] = await local.db
        .collection(item.name)
        .find({})
        .toArray();
    }

    const backupDir = path.join(__dirname, "backups");
    fs.mkdirSync(backupDir, { recursive: true });

    const backupFile = path.join(
      backupDir,
      "BalanceBitePersonal-backup-" + Date.now() + ".ejson"
    );

    fs.writeFileSync(
      backupFile,
      EJSON.stringify(backup, null, 2, { relaxed: false }),
      "utf8"
    );

    console.log("Local backup created:", backupFile);

    const existingNames = new Set(atlasCollections.map(c => c.name));

    for (const item of localCollections) {
      if (!existingNames.has(item.name)) {
        await atlas.db.createCollection(item.name);
      }
    }

    session = await atlas.startSession();

    let totalCopied = 0;

    await session.withTransaction(async () => {
      for (const item of localCollections) {
        const docs = backup[item.name];

        if (docs.length > 0) {
          await atlas.db.collection(item.name).insertMany(
            docs,
            { session }
          );
        }

        totalCopied += docs.length;
        console.log(item.name + ": " + docs.length + " documents");
      }
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary"
    });

    console.log("MIGRATION COMPLETED SUCCESSFULLY");
    console.log("Total documents copied:", totalCopied);
    console.log("Destination:", atlas.name);

  } catch (error) {
    console.error("MIGRATION STOPPED:", error.message);
    console.error("No partial transaction should remain committed.");
    process.exitCode = 1;
  } finally {
    if (session) await session.endSession();
    if (atlas) await atlas.close();
    if (local) await local.close();
  }
}

main();
