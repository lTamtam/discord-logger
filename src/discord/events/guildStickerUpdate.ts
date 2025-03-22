import { AuditLogEvent, Events, Sticker } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildStickerUpdate';

const event: BotEvent = {
    name: Events.GuildStickerUpdate,

    execute: async (oldSticker: Sticker, sticker: Sticker) => {
        if (!sticker.guild) return;

        const logs = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerUpdate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === sticker.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(sticker.guild, user?.id);

        const stickerUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: sticker.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildStickerUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Guild sticker was updated`,
                fields: [
                    { name: 'Name', value: `**Now:** \`${sticker.name}\`\n**Was:** \`${oldSticker.name}\`` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nSticker=${sticker.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x6FFBCB,
                thumbnail: { url: sticker.url },
                timestamp: new Date().toISOString()
            }]
        };

        await webhookSend(stickerUpdateEvent);
    }
};

export default event;