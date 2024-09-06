import { Channel, ChannelType, EmbedBuilder, Guild, Snowflake, Webhook, WebhookEditOptions } from "discord.js";
import prisma from "../clients/prisma";
import redis from "../clients/redis";
import { StoredWebhook, WebhookEvent } from "../types";
import logger from "./pino-logger";

/**
 * 
 * @param webhook 
 * @param options 
 * @returns {Promise<Webhook | null>}
 */
export async function editDiscordWebhook(webhook: Webhook, options: WebhookEditOptions): Promise<Webhook | null> {
    if (options.channel && (options.channel as Channel).type !== ChannelType.GuildText) return null;
    try {
        await webhook.edit(options);
        return webhook;
    }
    catch (err) {
        logger.error({
            app: 'Bot',
            action: 'edit_discord_webhook',
            err: err
        });
    }
    return null;
};

/**
 * 
 * @param webhook 
 * @param newChannel 
 * @returns {Promise<StoredWebhook | null>}
 */
export async function editDbWebhook(webhook: Webhook, newChannel: Channel): Promise<StoredWebhook | null> {
    if (newChannel.type !== ChannelType.GuildText) return null;
    try {
        await prisma.webhook.update({
            where: {
                id: webhook.id
            },
            data: {
                channelId: newChannel.id
            }
        });
        redis.set(`webhook-${newChannel.guildId}`, `${webhook.id}|${webhook.token}|${webhook.channelId}`, 'EX', 2592000);
        return { id: webhook.id, token: webhook.token!, channelId: webhook.channelId };
    }
    catch (err) {
        logger.error({
            action: 'edit_db_webhook',
            err: err
        });
    }
    return null;
};

/**
 * 
 * @param guild 
 * @returns {Promise<StoredWebhook | null>}
 */
export async function cacheWebhook(guildId: Snowflake): Promise<StoredWebhook | null> {
    try {
        const cache = await redis.get(`webhook-${guildId}`);
        if (cache?.split('|').length === 3) {
            const webhook = cache.split('|');
            return { id: webhook[0], token: webhook[1], channelId: webhook[2] };
        }
        const db = await prisma.webhook.findUnique({
            where: {
                guildId: guildId
            }
        });
        if (db) {
            redis.set(`webhook-${guildId}`, `${db.id}|${db.token}|${db.channelId}`);
            return { id: db.id, token: db.token, channelId: db.channelId };
        }
    }
    catch (err) {
        logger.error({
            action: 'cache_webhook',
            err: err
        });
    }
    return null;
};

/**
 * 
 * @param guild 
 * @returns {Promise<void>}
 */
export async function deleteWebhook(guild: Guild): Promise<void> {
    try {
        const cache = await redis.get(`webhook-${guild.id}`);
        if (cache) {
            await redis.del(`webhook-${guild.id}`);
        }
    }
    catch (err) {
        logger.error({
            app: 'Redis',
            action: 'delete_webhook',
            err: err
        });
    }
    try {
        const db = await prisma.webhook.findUnique({
            where: {
                guildId: guild.id
            }
        });
        if (db) {
            await prisma.webhook.delete({
                where: {
                    id: db.id
                }
            });
        }
    }
    catch (err) {
        logger.error({
            app: 'Database',
            action: 'delete_webhook',
            err: err
        });
    }
    try {
        const webhooks = await guild.fetchWebhooks();
        const webhook = webhooks.find(w => w.owner?.id === Bun.env.APP_ID);
        if (webhook) {
            await webhook.delete();
        }
    }
    catch (err) {
        logger.error({
            app: 'Bot',
            action: 'delete_webhook',
            err: err
        });
    }
};

/**
 * 
 * @param channel 
 * @returns {Promise<Webhook | null>}
 */
export async function createWebhook(channel: Channel): Promise<Webhook | null> {
    if (channel.type !== ChannelType.GuildText) return null;
    await deleteWebhook(channel.guild);
    try {
        const webhook = await channel.createWebhook({
            name: Bun.env.BOT_USERNAME!,
            avatar: Bun.env.WEBHOOK_AVATAR!
        });
        await prisma.webhook.create({
            data: {
                id: webhook.id,
                token: webhook.token!,
                channelId: channel.id,
                guild: {
                    connectOrCreate: {
                        create: {
                            id: channel.guildId
                        },
                        where: {
                            id: channel.guildId
                        }
                    }
                }
            }
        });
        redis.set(`webhook-${channel.guildId}`, `${webhook.id}|${webhook.token}|${channel.id}`, 'EX', 2592000);
        return webhook;
    }
    catch (err) {
        logger.error({
            action: 'create_webhook',
            err: err
        });
    }
    return null;
};

/**
 * 
 * @param guild 
 * @returns {Promise<Webhook | null>}
 */
export async function getWebhook(guild: Guild): Promise<Webhook | null> {
    let cache = await cacheWebhook(guild.id);
    if (!cache) return null;
    let webhook = await guild.client.fetchWebhook(cache.id, cache.token)
        .catch(err => null);
    if (!webhook) {
        const channel = guild.channels.cache.get(cache.channelId);
        if (!channel) return null;
        webhook = await createWebhook(channel);
    }
    else if (webhook.channelId !== cache.channelId) {
        editDbWebhook(webhook, webhook.channel!);
    }
    return webhook;
};

export async function webhookSend(event: WebhookEvent): Promise<Webhook | void> {
    const webhook = await getWebhook(event.guild);
    if (!webhook) return;
    return event.embeds.forEach(async e => {
        try {
            await webhook.send({
                embeds: [new EmbedBuilder(e)],
                files: event.files
            });
        }
        catch (err) {
            logger.error({
                app: 'Bot',
                action: 'webhook_send',
                event: event.eventName,
                timestamp: event.embeds[0].timestamp,
                uuid: event.id,
                err: err
            });
        }
    });
};