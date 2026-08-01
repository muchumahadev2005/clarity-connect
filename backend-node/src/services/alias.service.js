const Alias = require('../models/alias.model');

// Configuration
const ALIAS_DOMAIN = 'securesend.co.in';
const ALIAS_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_GENERATION_ATTEMPTS = 5;

const COMPANY_NAMES = [
  'tcs', 'wipro', 'infosys', 'hcl', 'techmahindra', 'accenture', 'cognizant', 'capgemini', 'mindtree', 'persistent',
  'ltimindtree', 'tataconsultancy', 'ibm', 'oracle', 'microsoft', 'google', 'amazon', 'adobe', 'nvidia', 'intel',
  'salesforce', 'servicenow', 'sap', 'zoom', 'slack', 'github', 'apple', 'meta', 'netflix', 'spotify'
];

/**
 * Generate a unique random alias with configurable expiry
 * @param {string} realEmail - The real email address to map
 * @param {number} expiryMs - Expiry time in milliseconds (default: 24 hours)
 * @returns {Promise<Object>} - { alias, realEmail, createdAt, expiresAt }
 * @throws {Error} If unable to generate unique alias after MAX_GENERATION_ATTEMPTS
 */
const generateAlias = async (realEmail, expiryMs = ALIAS_EXPIRY_MS) => {
  if (!realEmail || typeof realEmail !== 'string') {
    const error = new Error('Real email is required and must be a string.');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = realEmail.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error('Invalid email format.');
    error.status = 400;
    throw error;
  }

  let alias;
  let isUnique = false;
  let attempts = 0;

  // Generate unique alias with retry limit
  while (!isUnique && attempts < MAX_GENERATION_ATTEMPTS) {
    const baseName = COMPANY_NAMES[Math.floor(Math.random() * COMPANY_NAMES.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3 digit number (100-999)
    alias = `${baseName}${num}@${ALIAS_DOMAIN}`;

    // Check if alias already exists and is either active or not yet expired
    const existing = await Alias.findOne({
      alias: alias.toLowerCase(),
      expiresAt: { $gt: new Date() }, // Only check non-expired aliases
    });

    if (!existing) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    const error = new Error(
      'Unable to generate a unique alias after multiple attempts. Please try again.'
    );
    error.status = 503;
    error.details = { attempts: MAX_GENERATION_ATTEMPTS };
    console.error('[Alias Service] Failed to generate unique alias:', {
      attempts,
      email: normalizedEmail,
    });
    throw error;
  }

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + expiryMs);

  // Store the mapping
  const aliasDoc = new Alias({
    alias: alias.toLowerCase(),
    realEmail: normalizedEmail,
    isActive: true,
    expiresAt,
  });

  try {
    await aliasDoc.save();
  } catch (error) {
    if (error.code === 11000) {
      // Unique constraint violation - retry
      if (attempts < MAX_GENERATION_ATTEMPTS) {
        console.warn('[Alias Service] Unique constraint violation, retrying:', { alias });
        return generateAlias(realEmail, expiryMs);
      }
    }
    throw error;
  }

  console.log('[Alias Service] Alias generated:', {
    alias: aliasDoc.alias,
    realEmail: normalizedEmail,
    createdAt: aliasDoc.createdAt,
    expiresAt: aliasDoc.expiresAt,
    expiresInHours: Math.round((expiryMs / 1000 / 60 / 60) * 100) / 100,
  });

  return {
    alias: aliasDoc.alias,
    realEmail: aliasDoc.realEmail,
    createdAt: aliasDoc.createdAt,
    expiresAt: aliasDoc.expiresAt,
  };
};

/**
 * Validate that an alias is valid and can be used
 * @param {string} alias - The alias to validate
 * @returns {Promise<Object>} - { isValid, reason }
 */
const validateAlias = async (alias) => {
  if (!alias || typeof alias !== 'string') {
    return {
      isValid: false,
      reason: 'Alias is missing or invalid format.',
    };
  }

  const normalizedAlias = alias.toLowerCase().trim();

  const aliasDoc = await Alias.findOne({
    alias: normalizedAlias,
  });

  // Alias doesn't exist
  if (!aliasDoc) {
    return {
      isValid: false,
      reason: 'Alias not found.',
    };
  }

  // Alias exists but is not active
  if (!aliasDoc.isActive) {
    console.warn('[Alias Service] Attempted to use inactive alias:', {
      alias: normalizedAlias,
    });
    return {
      isValid: false,
      reason: 'Alias is no longer active.',
    };
  }

  // Alias is expired
  if (new Date() > aliasDoc.expiresAt) {
    // Mark as inactive
    await Alias.updateOne(
      { _id: aliasDoc._id },
      { $set: { isActive: false } }
    );
    console.warn('[Alias Service] Alias has expired:', {
      alias: normalizedAlias,
      expiresAt: aliasDoc.expiresAt,
    });
    return {
      isValid: false,
      reason: 'Alias has expired.',
    };
  }

  console.log('[Alias Service] Alias validated:', {
    alias: normalizedAlias,
    expiresAt: aliasDoc.expiresAt,
  });

  return {
    isValid: true,
    realEmail: aliasDoc.realEmail,
    expiresAt: aliasDoc.expiresAt,
  };
};

/**
 * Get the real email for a given alias (without validation)
 * Use validateAlias() instead for security checks
 * @param {string} alias - The alias to look up
 * @returns {Promise<string|null>} - The real email or null if not found
 */
const getEmailByAlias = async (alias) => {
  if (!alias) return null;
  const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
  return aliasDoc ? aliasDoc.realEmail : null;
};

/**
 * Deactivate an alias (soft delete)
 * @param {string} alias - The alias to deactivate
 * @returns {Promise<boolean>} - Success status
 */
const deactivateAlias = async (alias) => {
  if (!alias) return false;

  const result = await Alias.updateOne(
    { alias: alias.toLowerCase() },
    { $set: { isActive: false } }
  );

  if (result.modifiedCount > 0) {
    console.log('[Alias Service] Alias deactivated:', {
      alias: alias.toLowerCase(),
    });
    return true;
  }

  return false;
};

/**
 * Generate a random string of lowercase letters and numbers
 * Uses: a-z (26) + 0-9 (10) = 36 characters
 * @param {number} length - Desired length
 * @returns {string}
 */
const generateRandomString = (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  generateAlias,
  validateAlias,
  getEmailByAlias,
  deactivateAlias,
  ALIAS_DOMAIN,
  ALIAS_EXPIRY_MS,
  MAX_GENERATION_ATTEMPTS,
};
