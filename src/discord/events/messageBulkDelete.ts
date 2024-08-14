import { AttachmentBuilder, AuditLogEvent, Collection, Events, GuildTextBasedChannel, Message, PartialMessage, Snowflake } from 'discord.js';
import { appendFileSync, unlink } from 'fs';
import short from 'short-uuid';
import { BotEvent, CacheMessageObject, WebhookEvent } from '../../types';
import { getMember } from '../../utils/helpers';
import { getCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage } from '../../utils/messages/message-db';
import logger from '../../utils/pino-logger';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'messageBulkDelete';

const event: BotEvent = {
    name: Events.MessageBulkDelete,

    execute: async (messages: Collection<Snowflake, Message | PartialMessage>, channel: GuildTextBasedChannel) => {
        if (!channel.guild) return;

        let cacheMessages: CacheMessageObject[] = [];
        messages.forEach(async m => {
            let msg = getCacheMessage(m.id);
            if (!msg) msg = await getDbMessage(m.id);
            if (msg) cacheMessages.push(msg);
        });

        const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === channel.id && new Date().getTime() - e.createdTimestamp < 5000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(channel.guild, user?.id);

        const messageBulkDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: channel.guild,
            eventName: eventName,
            timestamp: new Date(),
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `**${messages.size}** messages bulk deleted in ${channel} (#${channel.name})`,
                fields: [
                    { name: 'Messages IDs', value: `\`\`\`${messages.map(m => `${m.id}`).join('\n')}\`\`\`` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${channel.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xF54831
            }]
        };

        let file: AttachmentBuilder[] = [];
        if (cacheMessages.length) {
            messageBulkDeleteEvent.embeds[0].description += `\n\n\`${cacheMessages.length}\` *messages were known in cache*`;
            const messagesList = cacheMessages.map(m => `MessageId: ${m.id} | Sent by: ${m.authorId} | Date: ${m.createdAt} | Content: ${m.content ?? '<None>'} | Attachments: ${m.attachmentsB64.length}`).join('\n');
            try { appendFileSync(`./tmp/deleted-messages-${uuid}.txt`, messagesList, 'utf-8') }
            catch (err) { logger.error({ app: 'Bot', uuid: uuid, event: eventName, err: err }) };
            file = [new AttachmentBuilder(`./tmp/deleted-messages-${uuid}.txt`)];
            messageBulkDeleteEvent.embeds[0].files = file;
        }

        await webhookSend(messageBulkDeleteEvent)
            .then(() => unlink(`./tmp/deleted-messages-${uuid}.txt`, (err) => { }));
    }
};

export default event;