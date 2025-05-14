import { AttachmentBuilder, AuditLogEvent, Collection, Events, GuildTextBasedChannel, Message, PartialMessage, Snowflake } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, CacheMessageObject, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { getCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage } from '../../utils/messages/message-db';
import logger from '../../utils/pino-logger';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'messageBulkDelete';

const event: BotEvent = {
    name: Events.MessageBulkDelete,

    execute: async (messages: Collection<Snowflake, Message | PartialMessage>, channel: GuildTextBasedChannel) => {
        if (!channel.guild) return;

        const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === channel.id);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(channel.guild, user?.id);

        let cacheMessages: CacheMessageObject[] = [];
        messages.forEach(async m => {
            let msg = getCacheMessage(m.id);
            if (!msg) msg = await getDbMessage(m.id);
            if (msg) cacheMessages.push(msg);
        });

        const messageBulkDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: channel.guild,
            name: eventName,
            bits: EVENTS_BITS.MessageBulkDelete,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `**${messages.size}** messages bulk deleted in ${channel} (#${channel.name})`,
                fields: [
                    { name: 'Messages IDs', value: `\`\`\`\n${messages.map(m => `${m.id}`).join('\n')}\`\`\`` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${channel.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                timestamp: new Date().toISOString()
            }]
        };

        if (cacheMessages.length) {
            messageBulkDeleteEvent.embeds[0].description += `\n\n\`${cacheMessages.length}\` *messages were known in cache*`;
            const messagesList = cacheMessages.map(m => `MessageId: ${m.id} │ AuthorId: ${m.authorId} │ Date: ${m.createdAt.toISOString()} │ Attachments: ${m.attachmentsB64.length.toString().padStart(2, '0')} │ Content: ${m.content.replaceAll(/(\r\n|\n|\r)/gm, '\\n ').replace(/\"/g, '"').replace(/`/g, '').replace(/│/g, '|') ?? '`<None>`'}`).join('\n');
            try {
                const file = [new AttachmentBuilder(Buffer.from(messagesList), { name: `deleted-messages-${uuid}.txt` })];
                messageBulkDeleteEvent.files = file;
            }
            catch (err) {
                logger.error({
                    app: 'Bot',
                    uuid: uuid,
                    event: eventName,
                    err: err
                });
            };
        }

        await webhookSend(messageBulkDeleteEvent);
    }
};

export default event;