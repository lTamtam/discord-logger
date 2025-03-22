import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const ITERS = 9999;

/**
 * Generates a new masterkey
 * @param size number of bytes to be generated
 * @returns {string}
 */
export function generateMasterKey(size?: number): string {
    if (!size) size = 256;
    const iVector = randomBytes(size);
    const key = iVector.toString('base64');
    console.log(key);
    return key;
};

// https://gist.github.com/AndiDittrich/4629e7db04819244e843
// https://gist.github.com/BigEdu/5696ea4fc704df7df516ccc1e06306b1

/**
 * Encrypts text by given key
 * @param text 
 * @param masterkey 
 * @returns {string}
 */
export function encrypt(text: string | null, masterkey?: string): string {
    if (!text) text = '`<None>`';
    if (!masterkey) masterkey = Bun.env.MASTERKEY!;
    const salt = randomBytes(64);
    const iVector = randomBytes(16);
    const key = pbkdf2Sync(masterkey, salt, ITERS, 32, 'sha512');
    const cipher = createCipheriv(ALGO, key, iVector);
    const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iVector, tag, encrypted]).toString('base64');
};

/**
 * Decrypts text by given key
 * @param text 
 * @param masterkey 
 * @returns {string}
 */
export function decrypt(text: string, masterkey?: string): string {
    if (!masterkey) masterkey = Bun.env.MASTERKEY!;
    const data = Buffer.from(text, 'base64');
    const salt = data.subarray(0, 64);
    const iVector = data.subarray(64, 80);
    const tag = data.subarray(80, 96);
    const encrypted = data.subarray(96).toString('base64');
    const key = pbkdf2Sync(masterkey, salt, ITERS, 32, 'sha512');
    const decipher = createDecipheriv(ALGO, key, iVector);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
};