import { Channel, ChannelType, ContainerBuilder, EmbedBuilder, FileBuilder, Guild, MessageFlags, SeparatorSpacingSize, Snowflake, TextDisplayBuilder, Webhook, WebhookEditOptions } from 'discord.js';
import prisma from '../databases/prisma';
import redis from '../databases/redis';
import { DbWebhook, DbWebhookEditOptions, WebhookEvent } from '../types';
import { EVENTS_BITS } from './events-typemaps';
import logger from './pino-logger';

/**
 * 
 * @arg {Webhook} webhook 
 * @arg {WebhookEditOptions} options 
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
 * @arg {Webhook} webhook 
 * @arg {DbWebhookEditOptions} options 
 * @returns {Promise<DbWebhook | null>}
 */
export async function editDbWebhook(webhook: Webhook, options: DbWebhookEditOptions): Promise<DbWebhook | null> {
    if (options.channel && options.channel.type !== ChannelType.GuildText) return null;
    try {
        const db = await prisma.webhook.update({
            where: {
                id: webhook.id
            },
            data: options
        });
        redis.set(`webhook:${db.guildId}`, `${db.id}|${db.token}|${db.channelId}|${db.events}`, 'EX', 2592000);
        return { id: db.id, token: db.token!, channelId: db.channelId, events: db.events };
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
 * @arg {Snowflake} guildId 
 * @returns {Promise<DbWebhook | null>}
 */
export async function cacheWebhook(guildId: Snowflake): Promise<DbWebhook | null> {
    try {
        const cache = await redis.get(`webhook:${guildId}`);
        if (cache?.split('|').length === 4) {
            const webhook = cache.split('|');
            return { id: webhook[0], token: webhook[1], channelId: webhook[2], events: parseInt(webhook[3]) };
        }
        const db = await prisma.webhook.findUnique({
            where: {
                guildId: guildId
            }
        });
        if (db) {
            redis.set(`webhook:${guildId}`, `${db.id}|${db.token}|${db.channelId}|${db.events}`);
            return { id: db.id, token: db.token, channelId: db.channelId, events: db.events };
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
 * @arg {Guild} guild 
 * @returns {Promise<void>}
 */
export async function deleteWebhook(guild: Guild): Promise<void> {
    try {
        const cache = await redis.get(`webhook:${guild.id}`);
        if (cache) {
            await redis.del(`webhook:${guild.id}`);
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
 * @arg {Channel} channel 
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
                events: EVENTS_BITS.Default,
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
        redis.set(`webhook:${channel.guildId}`, `${webhook.id}|${webhook.token}|${channel.id}|${EVENTS_BITS.Default}`, 'EX', 2592000);
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
 * @arg {Guild} guild 
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
    else if (webhook.channelId !== cache.channelId && webhook.channel?.type === ChannelType.GuildText) {
        editDbWebhook(webhook, { channel: webhook.channel! });
    }
    return webhook;
};

/**
 * 
 * @arg {WebhookEvent} event 
 * @returns {Promise<Webhook | void>}
 */
export async function webhookSend(event: WebhookEvent): Promise<Webhook | void> {
    const webhook = await getWebhook(event.guild);
    if (!webhook) return;
    const cache = await cacheWebhook(event.guild.id);
    if (!cache || !(cache.events & event.bits)) return;
    return event.embeds.forEach(async e => {
        try {
            await webhook.send({
                embeds: [new EmbedBuilder(e)],
                //files: event.files
            });
            if (event.files) {
                const title = new TextDisplayBuilder().setContent(`**Attached files**`);
                const files = event.files.map(f => new FileBuilder().setURL(`attachment://${f.name}`));
                const footer = new TextDisplayBuilder().setContent(`**-# ID: ${event.id}**`);
                await webhook.send({
                    components: [
                        new ContainerBuilder()
                            .addTextDisplayComponents(title)
                            .addFileComponents(files)
                            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                            .addTextDisplayComponents(footer)
                            .setAccentColor(event.embeds[0].color)
                    ],
                    files: event.files,
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
        catch (err) {
            logger.error({
                app: 'Bot',
                action: 'webhook_send',
                event: event.name,
                timestamp: event.embeds[0].timestamp,
                uuid: event.id,
                err: err
            });
        }
    });
};