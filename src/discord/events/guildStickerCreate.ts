import { AuditLogEvent, Events, Sticker } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { getMember } from '../../utils/helpers';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildStickerCreate';

const event: BotEvent = {
    name: Events.GuildStickerCreate,

    execute: async (sticker: Sticker) => {
        if (!sticker.guild) return;

        const logs = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerCreate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === sticker.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(sticker.guild, user?.id);

        const guildStickerCreateEvent: WebhookEvent = {
            id: uuid,
            guild: sticker.guild,
            eventName: eventName,
            timestamp: new Date(),
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Guild sticker was created`,
                fields: [
                    { name: 'Name', value: `\`${sticker.name}\`` },
                    { name: 'Link', value: `${sticker.url}` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nSticker=${sticker.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xD3FA89,
                thumbnail: { url: sticker.url }
            }]
        };

        await webhookSend(guildStickerCreateEvent);
    }
};

export default event;