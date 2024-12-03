import { Message, Snowflake } from 'discord.js';
import { MESSAGES_EXPIRATION } from '../../config/constants';
import prisma from '../../databases/prisma';
import { CacheMessageObject } from '../../types';
import { decrypt, encrypt } from '../encryption';
import logger from '../pino-logger';

export async function getDbMessage(messageId: Snowflake): Promise<CacheMessageObject | null> {
    try {
        const dbMessage = await prisma.message.findUnique({
            where: {
                id: messageId
            }
        });
        if (dbMessage) return {
            ...dbMessage,
            content: dbMessage.content ? decrypt(dbMessage.content) : '`<None>`',
            createdAt: new Date(dbMessage.createdAt)
        };
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'get_message',
            err: err
        });
    };
    return null;
};

export async function updateDbMessage(message: Message): Promise<void> {
    if (!message.guild) return;
    try {
        await prisma.message.update({
            where: {
                id: message.id
            },
            data: {
                authorId: message.author.id,
                content: encrypt(message.content ?? '`<None>`'),
                guild: {
                    connectOrCreate: {
                        create: {
                            id: message.guild.id
                        },
                        where: {
                            id: message.guild.id
                        }
                    }
                }
            }
        })
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'update_message',
            err: err
        });
    }
};

export async function deleteDbMessage(messageId: Snowflake): Promise<void> {
    try {
        await prisma.message.delete({
            where: {
                id: messageId
            }
        });
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'delete_message',
            err: err
        });
    }
};

export async function deleteDbUserMessages(userId: Snowflake): Promise<void> {
    try {
        await prisma.message.deleteMany({
            where: {
                authorId: userId
            }
        });
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'delete_user_messages',
            err: err
        });
    }
};

export async function deleteDbOldMessages() {
    const date = new Date().getTime();
    const limitDate = new Date(date - MESSAGES_EXPIRATION).toISOString();
    try {
        await prisma.message.deleteMany({
            where: {
                createdAt: {
                    lte: limitDate
                }
            }
        });
        logger.info({
            app: 'Database',
            action: 'delete_old_messages',
            limitDate: limitDate,
            duration: `${Math.round(new Date().getTime() - date)}ms`
        });
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'delete_old_messages',
            limitDate: limitDate,
            err: err
        });
    };
};