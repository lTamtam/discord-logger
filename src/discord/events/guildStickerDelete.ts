import { AuditLogEvent, Events, Sticker } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildStickerDelete';

const event: BotEvent = {
    name: Events.GuildStickerDelete,

    execute: async (sticker: Sticker) => {
        if (!sticker.guild) return;

        const logs = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === sticker.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(sticker.guild, user?.id);

        const guildStickerDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: sticker.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildStickerDelete,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Guild sticker was deleted`,
                fields: [
                    { name: 'Name', value: `\`${sticker.name}\`` },
                    { name: 'Link', value: `${sticker.url}` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nSticker=${sticker.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                thumbnail: { url: sticker.url },
                timestamp: new Date().toISOString()
            }]
        };

        await webhookSend(guildStickerDeleteEvent);
    }
};

export default event;