import { Message, Snowflake } from 'discord.js';
import { BATCH_EXPIRATION, BATCH_SIZE, DEFAULT_EXTENSION, DEFAULT_FILETYPE, MAX_ATTACHMENTS_SIZE, MAX_FILE_SIZE } from '../../config/constants';
import prisma from '../../databases/prisma';
import redis from '../../databases/redis';
import { CacheMessageArray, CacheMessageObject } from '../../types';
import { decrypt, encrypt } from '../encryption';
import logger from '../pino-logger';
import { deleteStreamKeys } from '../redisUtil';
import { dataToB64, getUniques } from '../util';

// https://github.com/oven-sh/bun/issues/267
// axios.defaults.headers.common['Accept-Encoding'] = 'gzip';

let batch: CacheMessageArray[] = [];

export async function addMessage(m: CacheMessageArray): Promise<void> {
    batch.push(m);
    try {
        redis.set(`message:${m[0]}:${m[1]}:${m[2]}:${m[3]}`, JSON.stringify(m));
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

export async function cacheMessage(message: Message): Promise<void> {
    if (!message.guild || message.webhookId) return;
    const content = encrypt(message.content ?? '`<None>`');
    const attachments = message.attachments.values();
    const b64Attachments: string[] = [];
    let totalSize = 0;
    for (const a of attachments) {
        try {
            const size = a.size;
            if (!size || size > MAX_FILE_SIZE || totalSize + size > MAX_ATTACHMENTS_SIZE) continue;
            const b64 = await dataToB64(a.url);
            if (b64) {
                a.name = a.name.replaceAll(';data:', '').replaceAll(';base64,', '');
                if (!a.contentType) a.contentType = DEFAULT_FILETYPE;
                const extension = a.name.split('.').at(-1) ?? DEFAULT_EXTENSION;
                // <name>.<extension>;data:<fileType>|<extension>;base64,<b64ImageData>
                b64Attachments.push(`${a.name};data:${a.contentType}|${extension};base64,${b64}`);
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
        new Date(message.createdTimestamp).toISOString()
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
                redis.set(`message:${m[0]}:${m[1]}:${m[2]}:${m[3]}`, JSON.stringify(m));
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
            const m = batch[i];
            batch = batch.splice(i);
            try {
                redis.del(`message:${m[0]}:${m[1]}:${m[2]}:${m[3]}`, JSON.stringify(batch[i]));
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

export function deleteCacheGuildMessages(guildId: Snowflake): void {
    batch = batch.filter(m => m[1] !== guildId);
    const stream = redis.scanStream({
        match: `message:${guildId}:*:*:*`,
        type: 'string',
        count: BATCH_SIZE
    });
    deleteStreamKeys(stream, { action: 'delete_cache_guild_messages', guildId });
};

export function deleteCacheChannelMessages(channelId: Snowflake): void {
    batch = batch.filter(m => m[2] !== channelId);
    const stream = redis.scanStream({
        match: `message:*:${channelId}:*:*`,
        type: 'string',
        count: BATCH_SIZE
    });
    deleteStreamKeys(stream, { action: 'delete_cache_channel_messages', channelId });
};

export function deleteCacheUserMessages(userId: Snowflake): void {
    batch = batch.filter(m => m[3] !== userId);
    const stream = redis.scanStream({
        match: `message:*:*:*:${userId}`,
        type: 'string',
        count: BATCH_SIZE
    });
    deleteStreamKeys(stream, { action: 'delete_cache_user_messages', userId });
};

export function deleteCacheMessages(): void {
    const stream = redis.scanStream({
        match: `message:*:*:*:*`,
        type: 'string',
        count: BATCH_SIZE
    });
    deleteStreamKeys(stream, { action: 'delete_cache_messages' });
};

export async function submitBatch(): Promise<void> {
    const batchToSubmit = batch.splice(0, BATCH_SIZE);
    try {
        const start = new Date().getTime();
        const guilds = getUniques(batchToSubmit.map(m => m[1]));
        for (let g of guilds) {
            await prisma.guild.upsert({
                where: {
                    id: g
                },
                create: {
                    id: g
                },
                update: {}
            });
        }
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
        deleteCacheMessages();
        logger.info({
            app: 'Database',
            action: 'submit_batch',
            duration: `${Math.round(new Date().getTime() - start)}ms`,
            messages: batchToSubmit.length
        });
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'submit_batch',
            err: err
        });
    }
};

(async () => {
    if (process.argv[1].split('/').at(-1) !== 'index.ts') return;
    const start = new Date().getTime();
    const stream = redis.scanStream({
        match: `message:*:*:*:*`,
        type: 'string',
        count: BATCH_SIZE
    });
    stream.on('data', async (d: string[]) => {
        if (d.length) {
            const pipeline = redis.pipeline();
            d.forEach(k => {
                pipeline.get(k);
            });
            const result = await pipeline.exec() as (string)[][];
            batch.push(...result.flat().filter(m => m !== null).map(m => JSON.parse(m)));
            logger.info({
                app: 'Redis',
                action: 'recover_cache_messages',
                duration: `${Math.round(new Date().getTime() - start)}ms`,
                messages: batch.length
            });
        }
    })
    stream.on('error', err => {
        logger.error({
            app: 'Redis',
            action: 'recover_cache_messages',
            err: err
        });
    });
})();