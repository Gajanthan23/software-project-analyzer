/**
 * utils/initDb.js
 * 
 * Helper script to initialize the PostgreSQL database.
 * 1. Connects to the default 'postgres' database to ensure the target database exists.
 * 2. Creates the target database if it does not exist.
 * 3. Connects to the target database and runs schema.sql and seed.sql.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');
const logger = require('./logger');

// Parse database URL to isolate database name
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  logger.error('DATABASE_URL is not defined in environment variables.');
  process.exit(1);
}

// Extract database name from connection URL
// Example: postgresql://user:pass@host:5432/dbname
const dbUrlPattern = /^(postgresql:\/\/[^/]+\/)([^?#]+)(.*)$/;
const matches = connectionString.match(dbUrlPattern);

if (!matches) {
  logger.error('Invalid DATABASE_URL format. Must be a valid connection string.');
  process.exit(1);
}

const baseUrl = matches[1];
const targetDb = matches[2];
const urlParams = matches[3];
const defaultDbUrl = `${baseUrl}postgres${urlParams}`;

const ensureDatabaseExists = async () => {
  logger.info(`Connecting to default DB to ensure '${targetDb}' exists...`);
  
  const client = new Client({ connectionString: defaultDbUrl });
  try {
    await client.connect();
    
    // Check if database exists
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (res.rowCount === 0) {
      logger.info(`Database '${targetDb}' does not exist. Creating it...`);
      // CREATE DATABASE cannot be executed in a transaction, run it directly
      await client.query(`CREATE DATABASE "${targetDb}"`);
      logger.info(`Database '${targetDb}' created successfully.`);
    } else {
      logger.info(`Database '${targetDb}' already exists.`);
    }
  } catch (err) {
    logger.error('Error ensuring database exists', err);
    throw err;
  } finally {
    await client.end();
  }
};

const runInit = async () => {
  try {
    // 1. Ensure database exists
    await ensureDatabaseExists();

    // 2. Initialize target database connection pool
    logger.info(`Connecting to database '${targetDb}'...`);
    const pool = new Pool({ connectionString });

    // 3. Read schema.sql
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    logger.info(`Reading schema from ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 4. Execute schema.sql
    logger.info('Executing schema SQL...');
    await pool.query(schemaSql);
    logger.info('Database schema initialized successfully!');

    // 5. Read & execute seed.sql if present
    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      logger.info(`Reading seeds from ${seedPath}`);
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      if (seedSql.trim()) {
        logger.info('Executing seed SQL...');
        await pool.query(seedSql);
        logger.info('Database seeds initialized successfully!');
      } else {
        logger.info('Seed file is empty. Skipping seeding.');
      }
    }

    await pool.end();
    logger.info('Database initialization finished successfully.');
  } catch (err) {
    logger.error('Failed to initialize database', err);
    process.exit(1);
  }
};

runInit();
