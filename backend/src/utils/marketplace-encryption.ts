import crypto from 'node:crypto';

const MASTER_KEY = process.env.MARKETPLACE_ENCRYPTION_KEY;

if (!MASTER_KEY) {
  console.warn(
    '[marketplace-encryption] MARKETPLACE_ENCRYPTION_KEY is not set. ' +
    'A random key will be used — encrypted messages will be lost on restart.',
  );
}

const effectiveKey = MASTER_KEY || crypto.randomBytes(32).toString('hex');

function deriveKey(conversationId: string): Buffer {
  const masterKeyBuf = Buffer.from(effectiveKey, 'hex');
  return Buffer.from(crypto.hkdfSync('sha256', masterKeyBuf, conversationId, 'marketplace-msg', 32));
}

export function encryptMessage(conversationId: string, plaintext: string): string {
  const key = deriveKey(conversationId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptMessage(conversationId: string, ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const key = deriveKey(conversationId);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function generateConversationId(userId1: string, userId2: string, listingId: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}_${listingId}`;
}
