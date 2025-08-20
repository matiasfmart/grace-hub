
import { MongoClient } from 'mongodb';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// --- Configuration ---
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'grace-hub';
const DB_FOLDER_PATH = path.join(process.cwd(), 'src/lib');

const MIGRATION_MAP = {
  'members-db.json': 'members',
  'gdis-db.json': 'gdis',
  'ministry-areas-db.json': 'ministry-areas',
  'meetings-db.json': 'meetings',
  'meeting-series-db.json': 'meeting-series',
  'attendance-db.json': 'attendance',
  'tithes-db.json': 'tithes',
};

// --- Main Script ---
async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  console.log('Connecting to MongoDB...');
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected successfully to database: ${DB_NAME}`);

    for (const [jsonFile, collectionName] of Object.entries(MIGRATION_MAP)) {
      console.log(`
Processing ${jsonFile} -> ${collectionName} collection...`);
      
      // 1. Read data from JSON file
      const filePath = path.join(DB_FOLDER_PATH, jsonFile);
      let data;
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        data = JSON.parse(fileContent);
        if (!Array.isArray(data)) {
          console.error(`  - ERROR: Data in ${jsonFile} is not an array. Skipping.`);
          continue;
        }
        console.log(`  - Read ${data.length} documents from ${jsonFile}.`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  - INFO: File ${jsonFile} not found. Skipping.`);
          continue;
        }
        console.error(`  - ERROR: Failed to read or parse ${jsonFile}.`, error);
        continue;
      }

      // 2. Get collection and clear it
      const collection = db.collection(collectionName);
      console.log(`  - Clearing collection "${collectionName}"...`);
      await collection.deleteMany({});

      // 3. Insert new data
      if (data.length > 0) {
        console.log(`  - Inserting ${data.length} documents...`);
        await collection.insertMany(data);
        console.log(`  - SUCCESS: Migrated data for "${collectionName}".`);
      } else {
        console.log(`  - INFO: No data to insert for "${collectionName}".`);
      }
    }

    console.log('
Migration completed successfully!');

  } catch (error) {
    console.error('
An error occurred during migration:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

migrate();
