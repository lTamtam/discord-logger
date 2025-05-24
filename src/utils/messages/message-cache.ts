import { Message, Snowflake } from 'discord.js';
import { BATCH_EXPIRATION, BATCH_LENGTH, DEFAULT_EXTENSION, DEFAULT_FILETYPE, EMPTY_STRING, MAX_ATTACHMENTS_SIZE, MAX_FILE_SIZE } from '../../config/constants';
import prisma from '../../databases/prisma';
import redis from '../../databases/redis';
import { CacheMessageArray, CacheMessageObject } from '../../types';
import { decrypt, encrypt } from '../encryption';
import logger from '../pino-logger';
import { deleteStreamKeys } from '../redis-util';
import { dataToB64, getUniques } from '../util';

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
    if (batch.length >= BATCH_LENGTH || new Date().getTime() - Date.parse(batch[0][7]) >= BATCH_EXPIRATION) {
        await submitBatch();
    }
};

export async function cacheMessage(message: Message): Promise<void> {
    if (!message.guild || message.webhookId) return;
    const content = encrypt(message.content ?? EMPTY_STRING);
    const attachments = message.attachments.values();
    const b64Attachments: string[] = [];
    let totalSize = 0;
    await Promise.all(attachments.map(async a => {
        try {
            const size = a.size;
            if (!size || size > MAX_FILE_SIZE || totalSize + size > MAX_ATTACHMENTS_SIZE) return;
            const b64 = await dataToB64(a.url);
            if (b64) {
                a.name = a.name.replaceAll(';data:', '').replaceAll(';base64,', '').replaceAll('|', '').replaceAll(';', '');
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
            return;
        }
    }));
    addMessage([
        message.id,
        message.guild.id,
        message.channel.id,
        message.author.id,
        content,
        message.attachments.size,
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
        attachments: message[5],
        attachmentsB64: message[6],
        createdAt: new Date(message[7])
    };
};

export function updateCacheMessage(messageId: Snowflake, content: string): void {
    for (let m of batch) {
        if (m[0] === messageId) {
            m[4] = encrypt(content ?? EMPTY_STRING);
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
        count: BATCH_LENGTH
    });
    deleteStreamKeys(stream, { action: 'delete_cache_guild_messages', guildId });
};

export function deleteCacheChannelMessages(channelId: Snowflake): void {
    batch = batch.filter(m => m[2] !== channelId);
    const stream = redis.scanStream({
        match: `message:*:${channelId}:*:*`,
        type: 'string',
        count: BATCH_LENGTH
    });
    deleteStreamKeys(stream, { action: 'delete_cache_channel_messages', channelId });
};

export function deleteCacheUserMessages(userId: Snowflake): void {
    batch = batch.filter(m => m[3] !== userId);
    const stream = redis.scanStream({
        match: `message:*:*:*:${userId}`,
        type: 'string',
        count: BATCH_LENGTH
    });
    deleteStreamKeys(stream, { action: 'delete_cache_user_messages', userId });
};

export function deleteCacheMessages(): void {
    const stream = redis.scanStream({
        match: `message:*:*:*:*`,
        type: 'string',
        count: BATCH_LENGTH
    });
    deleteStreamKeys(stream, { action: 'delete_cache_messages' });
};

export async function submitBatch(): Promise<void> {
    const batchToSubmit = batch.splice(0, BATCH_LENGTH);
    try {
        const start = new Date().getTime();
        const guilds = getUniques(batchToSubmit.map(m => m[1]));
        const upsertGuilds = guilds.map(g => prisma.guild.upsert({
            where: {
                id: g
            },
            create: {
                id: g
            },
            update: {}
        }));
        await Promise.all(upsertGuilds);
        await prisma.message.createMany({
            data: batchToSubmit.map(m => ({
                id: m[0],
                guildId: m[1],
                channelId: m[2],
                authorId: m[3],
                content: m[4],
                attachments: m[5],
                attachmentsB64: m[6],
                createdAt: m[7],
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
        count: BATCH_LENGTH
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