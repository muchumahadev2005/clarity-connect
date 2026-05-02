const fs = require('fs/promises');
const path = require('path');

const payloadDir = path.join(__dirname, '../../storage/messages');

const ensureDir = async () => {
  await fs.mkdir(payloadDir, { recursive: true });
};

const safeFileName = (fileName) => path.basename(fileName);

const filePathFromName = (fileName) => path.join(payloadDir, safeFileName(fileName));

const storeEncryptedPayload = async (fileName, encryptedData) => {
  await ensureDir();
  await fs.writeFile(filePathFromName(fileName), encryptedData, 'utf8');
};

const loadEncryptedPayload = async (fileName) => {
  try {
    return await fs.readFile(filePathFromName(fileName), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    throw err;
  }
};

const deleteEncryptedPayload = async (fileName) => {
  try {
    await fs.unlink(filePathFromName(fileName));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

module.exports = {
  storeEncryptedPayload,
  loadEncryptedPayload,
  deleteEncryptedPayload,
};
