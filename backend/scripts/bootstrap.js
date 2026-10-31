import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/config/logger.js';
import { ROLES } from '../src/constants/roles.js';
import { Dataset } from '../src/models/Dataset.js';
import { User } from '../src/models/User.js';
import { activateDataset, importDataset } from '../src/services/dataset/dataset.service.js';
import { createUserAccount } from '../src/services/auth.service.js';
import dns from 'node:dns';

dns.setServers(['10.228.50.137']);

// Keep your existing bootstrap imports and code.
// Ensure the database connection starts after this configuration.
async function ensureInitialAdmin() {
  const currentAdmin = await User.findOne({ role: ROLES.ADMIN });
  if (currentAdmin) {
    logger.info('An Admin account already exists; bootstrap will not create another one.');
    return currentAdmin;
  }

  const { initialAdminName: name, initialAdminEmail: email, initialAdminPassword: password } = env;
  if (!name || !email || !password) {
    const error = new Error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD in .env to create the first Admin account.');
    error.code = 'INITIAL_ADMIN_CONFIG_REQUIRED';
    throw error;
  }
  if (password.length < 12) {
    const error = new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters long.');
    error.code = 'INITIAL_ADMIN_PASSWORD_TOO_SHORT';
    throw error;
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    const error = new Error('INITIAL_ADMIN_EMAIL belongs to a non-Admin account. Choose a different email.');
    error.code = 'INITIAL_ADMIN_EMAIL_IN_USE';
    throw error;
  }
  const admin = await createUserAccount({ name, email, password, role: ROLES.ADMIN });
  logger.info('Created the initial Admin account.', { email: admin.email });
  return admin;
}

async function ensureActiveStarterDataset(adminId) {
  const active = await Dataset.findOne({ status: 'active' });
  if (active) {
    logger.info('An active dataset already exists; bootstrap left it unchanged.', { datasetId: active.datasetId, revision: active.revision });
    return;
  }

  let starter = await Dataset.findOne({ datasetId: 'cit-public-v1' }).sort({ revision: -1 });
  if (!starter) {
    const path = fileURLToPath(new URL('../data/cit_public.json', import.meta.url));
    const source = JSON.parse(await readFile(path, 'utf8'));
    starter = await importDataset(source, { sourceFileName: 'cit_public.json', importedBy: adminId });
    logger.info('Imported the starter dataset.', { datasetId: starter.datasetId, revision: starter.revision });
  }
  await activateDataset(starter._id, adminId);
  logger.info('Activated the starter dataset.', { datasetId: starter.datasetId, revision: starter.revision });
}

try {
  await connectDatabase();
  const admin = await ensureInitialAdmin();
  await ensureActiveStarterDataset(admin?._id ?? admin?.id ?? null);
  logger.info('Bootstrap completed. Start the API with npm run dev.');
} catch (error) {
  logger.error('Bootstrap failed.', { code: error.code, message: error.message });
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
