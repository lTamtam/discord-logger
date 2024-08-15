import axios from 'axios';
import { Message, Snowflake } from 'discord.js';
import prisma from '../../clients/prisma';
import { CacheMessageArray, CacheMessageObject } from '../../types';
import { BATCH_EXPIRATION, BATCH_SIZE, MAX_ATTACHMENTS_SIZE, MAX_FILE_SIZE } from '../constants';
import { decrypt, encrypt } from '../encryption';
import logger from '../pino-logger';

const EXT_MAP = Bun.file(`${import.meta.dir.split('src/')[0]}src/utils/file-extensions-map.json`);

// https://github.com/oven-sh/bun/issues/267
// axios.defaults.headers.common['Accept-Encoding'] = 'gzip';

let batch: CacheMessageArray[] = [];

export async function addMessage(messageArray: CacheMessageArray): Promise<void> {
    batch.push(messageArray);
    if (batch.length >= BATCH_SIZE || new Date().getTime() - Date.parse(batch[0][5]) >= BATCH_EXPIRATION) {
        await submitBatch();
    }
};

export async function cacheMessage(message: Message) {
    if (!message.guild || message.webhookId) return;
    const extensions: { [key: string]: string[] } = await EXT_MAP.json();
    const content = encrypt(message.content ?? '`<None>`');
    const attachments = message.attachments.map(a => a);
    const b64Attachments: string[] = [];
    let totalSize = 0;
    for (const a of attachments) {
        try {
            const head = await axios.head(a.url);
            const size = parseInt(head.headers['content-length']);
            if (!size || size > MAX_FILE_SIZE || totalSize + size > MAX_ATTACHMENTS_SIZE) continue;
            const res = await axios.get(a.url, { responseType: 'arraybuffer' });
            if (res) {
                const encoding = extensions[a.contentType?.split(';')[0] ?? 'text/plain'][0];
                let buffer = Buffer.from(res.data, 'binary');
                b64Attachments.push(`data:${encoding};base64,${buffer.toString('base64')}`);
                totalSize += size;
            }
        }
        catch (err) {
            logger.error({
                app: 'Cache',
                action: 'cache_new_message',
                err: err
            });
            continue;
        }
    }
    addMessage([message.id, message.guild.id, message.author.id, content, b64Attachments, new Date().toISOString()]);
};

export function getCacheMessage(messageId: Snowflake): CacheMessageObject | null {
    const message = batch.find(m => m[0] === messageId);
    if (!message) return null;
    return {
        id: message[0],
        guildId: message[1],
        authorId: message[2],
        content: decrypt(message[3]),
        attachmentsB64: message[4],
        createdAt: new Date(message[5])
    };
};

export function updateCacheMessage(messageId: Snowflake, content: string): void {
    for (let m of batch) {
        if (m[3] === messageId) {
            m[3] = encrypt(content ?? '`<None>`');
            break;
        }
    }
};

export function deleteCacheMessage(messageId: Snowflake): void {
    for (let i = 0; i < batch.length; i++) {
        if (batch[i][0] === messageId) {
            batch = batch.splice(i);
            break;
        }
    }
};

export function deleteCacheUserMessages(userId: Snowflake): void {
    batch = batch.filter(m => m[2] !== userId);
};

export function deleteCacheGuildMessages(guildId: Snowflake): void {
    batch = batch.filter(m => m[1] !== guildId);
};

export async function submitBatch(): Promise<void> {
    const batchToSubmit = batch.splice(0, BATCH_SIZE);
    try {
        await prisma.message.createMany({
            data: batchToSubmit.map(m => ({
                id: m[0],
                guild: {
                    connectOrCreate: {
                        create: {
                            id: m[1]
                        },
                        where: {
                            id: m[1]
                        }
                    }
                },
                guildId: m[1],
                authorId: m[2],
                content: m[3],
                attachmentsB64: m[4],
                createdAt: m[5],
            }))
        })
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'submit_batch',
            err: err
        });
    }
};