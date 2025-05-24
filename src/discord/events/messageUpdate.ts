import { ChannelType, Events, Message, PartialMessage } from 'discord.js';
import short from 'short-uuid';
import { EMPTY_STRING, MAX_EMBED_DESCRIPTION, MAX_EMBED_FIELD_VALUE } from '../../config/constants';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { cacheMessage, getCacheMessage, updateCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage, updateDbMessage } from '../../utils/messages/message-db';
import { chunkify, getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'messageUpdate';

const event: BotEvent = {
    name: Events.MessageUpdate,

    execute: async (oldMessage: Message | PartialMessage, message: Message) => {
        if (message.content === oldMessage.content || message.author.bot || !message.guild || message.channel.type === ChannelType.DM) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = message.author;
        const userId = user.id;
        const member = await getMember(message.guild, user?.id);

        let cachedMessage = getCacheMessage(message.id);
        if (cachedMessage) updateCacheMessage(message.id, message.content);
        else {
            cachedMessage = await getDbMessage(message.id);
            if (cachedMessage) await updateDbMessage(message);
        }
        if (!cachedMessage) {
            cachedMessage = {
                id: oldMessage.id,
                guildId: message.guild.id,
                channelId: message.channel.id,
                authorId: message.author.id,
                createdAt: oldMessage.createdAt,
                content: oldMessage.content ?? '`<Unknown>`',
                attachments: oldMessage.attachments.size,
                attachmentsB64: []
            };
            await cacheMessage(message);
        }

        const messageUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: message.guild,
            name: eventName,
            bits: EVENTS_BITS.MessageUpdate,
            embeds: [{
                author: {
                    name: `${user.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Message updated in ${message.channel} (#${message.channel.name})`,
                fields: [
                    { name: `${message.channel.isThread() ? 'Thread' : 'Channel'}`, value: `${message.channel} [**Go to message**](${message.url})` },
                    { name: 'Creation date', value: `<t:${Math.round(message.createdAt.getTime() / 1000)}:F>` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x42BFF5,
                timestamp: new Date().toISOString()
            }]
        };

        if (cachedMessage.content.length + message.content.length > MAX_EMBED_DESCRIPTION - 20) {
            messageUpdateEvent.embeds.push(JSON.parse(JSON.stringify(messageUpdateEvent.embeds[0])));
            messageUpdateEvent.embeds[0].fields = [];
            messageUpdateEvent.embeds[0].description += `\n\n**Now:**\n${message.content}`;
            messageUpdateEvent.embeds[1].description = `**Was:**\n${cachedMessage.content}`;
        }

        else {
            let newChunks = [];
            let oldChunks = [];
            if (message.content) {
                if (message.content.length > MAX_EMBED_FIELD_VALUE) {
                    newChunks = chunkify(message.content.replace(/\"/g, '"').replace(/`/g, ''));
                }
                else newChunks.push(message.content);
            }
            else newChunks.push(EMPTY_STRING);
            if (cachedMessage.content) {
                if (cachedMessage.content.length > MAX_EMBED_FIELD_VALUE) {
                    oldChunks = chunkify(cachedMessage.content.replace(/\"/g, '"').replace(/`/g, ''));
                }
                else oldChunks.push(cachedMessage.content);
            }
            else oldChunks.push(EMPTY_STRING);

            newChunks.forEach((c: string, i) => {
                messageUpdateEvent.embeds[0].fields.push({
                    name: `New content ${newChunks.length > 1 ? `(${i + 1}/${newChunks.length})` : ''}`,
                    value: c
                })
            });
            oldChunks.forEach((c: string, i) => {
                messageUpdateEvent.embeds[0].fields.push({
                    name: `Old content ${oldChunks.length > 1 ? `(${i + 1}/${oldChunks.length})` : ''}`,
                    value: c
                })
            });
        }

        messageUpdateEvent.embeds[messageUpdateEvent.embeds.length - 1].fields.push(
            { name: 'ID', value: `\`\`\`ini\nAuthor=${userId}\nMessage=${message.id}\nChannel=${message.channel.id}\`\`\`` }
        );

        await webhookSend(messageUpdateEvent);
    }
};

export default event;