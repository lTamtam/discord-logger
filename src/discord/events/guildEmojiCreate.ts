import { AuditLogEvent, Events, GuildEmoji } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildEmojiCreate';

const event: BotEvent = {
    name: Events.GuildEmojiCreate,

    execute: async (emoji: GuildEmoji) => {
        const logs = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === emoji.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(emoji.guild, user?.id);
        const extension = emoji.animated ? 'gif' : 'png';

        const guildEmojiCreateEvent: WebhookEvent = {
            id: uuid,
            guild: emoji.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildEmojiCreate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${emoji.animated ? 'Animated' : 'Static'} guild emoji was created`,
                fields: [
                    { name: 'Name', value: `\`${emoji.name}\`` },
                    { name: 'Managed', value: `${emoji.managed ? 'Yes' : 'No'}` },
                    { name: 'Link', value: `${emoji.imageURL({ extension: extension })}\n<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nEmoji=${emoji.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x6FFBCB,
                thumbnail: { url: emoji.imageURL({ extension: extension }) },
                timestamp: new Date().toISOString()
            }],
        };

        await webhookSend(guildEmojiCreateEvent);
    }
};

export default event;