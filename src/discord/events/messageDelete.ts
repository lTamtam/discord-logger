import { AuditLogEvent, ChannelType, Events, Message, PartialMessage } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { MAX_EMBED_FIELD_VALUE } from '../../utils/constants';
import { chunkify, getMember } from '../../utils/helpers';
import { getCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage } from '../../utils/messages/message-db';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'messageDelete';

const event: BotEvent = {
    name: Events.MessageDelete,

    execute: async (message: Message | PartialMessage) => {
        if (!message.author || message.author.bot || !message.guild || message.channel.type === ChannelType.DM) return;

        const user = message.author;
        if (!user) return;

        const logs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === user.id && new Date().getTime() - e.createdTimestamp < 3000);

        const suuid = short();
        const uuid = suuid.new();
        const member = await getMember(message.guild, user?.id);
        const executor = log?.executor ?? user;

        let cachedMessage = getCacheMessage(message.id);
        if (!cachedMessage) cachedMessage = await getDbMessage(message.id);
        if (!cachedMessage) return;

        const messageDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: message.guild,
            eventName: eventName,
            timestamp: new Date(),
            embeds: [{
                author: {
                    name: `${user.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Message deleted in ${message.channel} (#${message.channel.name})`,
                fields: [
                    { name: 'Creation date', value: `<t:${Math.round(cachedMessage.createdAt.getTime() / 1000)}:F>` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A
            }]
        };

        let chunks = [];
        if (cachedMessage.content) {
            if (cachedMessage.content.length > MAX_EMBED_FIELD_VALUE) {
                chunks = chunkify(cachedMessage.content.replace(/\"/g, '"').replace(/`/g, ''));
            }
            else chunks.push(cachedMessage.content);
        }
        else chunks.push('\`<None>\`');

        chunks.forEach((c: string, i) => {
            messageDeleteEvent.embeds[0].fields.push({
                name: `Content ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}`,
                value: c
            })
        });

        messageDeleteEvent.embeds[0].fields.push(
            { name: 'ID', value: `\`\`\`ini\n${user !== executor ? `Executor=${executor?.id ?? '???'}\n` : ''}Author=${message.author.id}\nMessage=${cachedMessage.id}\nChannel=${message.channel.id}\`\`\`` }
        );

        await webhookSend(messageDeleteEvent);
    }
};

export default event;