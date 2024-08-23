import axios from 'axios';
import { Message, Snowflake } from 'discord.js';
import prisma from '../../clients/prisma';
import redis from '../../clients/redis';
import { CacheMessageArray, CacheMessageObject } from '../../types';
import { BATCH_EXPIRATION, BATCH_SIZE, MAX_ATTACHMENTS_SIZE, MAX_FILE_SIZE } from '../constants';
import { decrypt, encrypt } from '../encryption';
import logger from '../pino-logger';

const EXT_MAP = Bun.file(`${import.meta.dir.split('src/')[0]}src/utils/file-extensions-map.json`);

// https://github.com/oven-sh/bun/issues/267
// axios.defaults.headers.common['Accept-Encoding'] = 'gzip';

let batch: CacheMessageArray[] = [];
(async () => { await redis.get(`messages-batch`).then(c => { if (c) batch = JSON.parse(c).catch(() => { }) }).catch(() => { }); })();

export async function addMessage(messageArray: CacheMessageArray): Promise<void> {
    batch.push(messageArray);
    try {
        redis.set(`messages-batch`, JSON.stringify(batch));
    }
    catch (err) {
        logger.error({
            app: 'Redis',
            action: 'add_message',
            err: err
        });
    }
    if (batch.length >= BATCH_SIZE || new Date().getTime() - Date.parse(batch[0][6]) >= BATCH_EXPIRATION) {
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
            if (!a.contentType) a.contentType = 'text/plain';
            const head = await axios.head(a.url);
            const size = parseInt(head.headers['content-length']);
            if (!size || size > MAX_FILE_SIZE || totalSize + size > MAX_ATTACHMENTS_SIZE) continue;
            const res = await axios.get(a.url, { responseType: 'arraybuffer' });
            if (res) {
                const encoding = extensions[a.contentType] ? extensions[a.contentType][0] : extensions['text/plain'][0];
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
    addMessage([
        message.id,
        message.guild.id,
        message.channel.id,
        message.author.id,
        content,
        b64Attachments,
        new Date().toISOString()
    ]);
};

export function getCacheMessage(messageId: Snowflake): CacheMessageObject | null {
    const message = batch.find(m => m[0] === messageId);
    if (!message) return null;
    return {
        id: message[0],
        guildId: message[1],
        channelId: message[2],
        authorId: message[3],
        content: decrypt(message[4]),
        attachmentsB64: message[5],
        createdAt: new Date(message[6])
    };
};

export function updateCacheMessage(messageId: Snowflake, content: string): void {
    for (let m of batch) {
        if (m[0] === messageId) {
            m[4] = encrypt(content ?? '`<None>`');
            try {
                redis.set(`messages-batch`, JSON.stringify(batch));
            }
            catch (err) {
                logger.error({
                    app: 'Redis',
                    action: 'update_cache_message',
                    err: err
                });
            }
            break;
        }
    }
};

export function deleteCacheMessage(messageId: Snowflake): void {
    for (let i = 0; i < batch.length; i++) {
        if (batch[i][0] === messageId) {
            batch = batch.splice(i);
            try {
                redis.set(`messages-batch`, JSON.stringify(batch));
            }
            catch (err) {
                logger.error({
                    app: 'Redis',
                    action: 'delete_cache_message',
                    err: err
                });
            }
            break;
        }
    }
};

export function deleteCacheUserMessages(userId: Snowflake): void {
    batch = batch.filter(m => m[3] !== userId);
    try {
        redis.set(`messages-batch`, JSON.stringify(batch));
    }
    catch (err) {
        logger.error({
            app: 'Redis',
            action: 'delete_cache_user_messages',
            err: err
        });
    }
};

export function deleteCacheGuildMessages(guildId: Snowflake): void {
    batch = batch.filter(m => m[1] !== guildId);
    try {
        redis.set(`messages-batch`, JSON.stringify(batch));
    }
    catch (err) {
        logger.error({
            app: 'Redis',
            action: 'delete_cache_guild_messages',
            err: err
        });
    }
};

export async function submitBatch(): Promise<void> {
    const batchToSubmit = batch.splice(0, BATCH_SIZE);
    try {
        redis.del(`messages-batch`);
        await prisma.message.createMany({
            data: batchToSubmit.map(m => ({
                id: m[0],
                guildId: m[1],
                channelId: m[2],
                authorId: m[3],
                content: m[4],
                attachmentsB64: m[5],
                createdAt: m[6],
            }))
        });
    }
    catch (err) {
        logger.error({
            app: 'Redis/Database',
            action: 'submit_batch',
            err: err
        });
    }
};