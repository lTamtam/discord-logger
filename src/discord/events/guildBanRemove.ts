import { AuditLogEvent, Events, GuildBan } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildBanRemove';

const event: BotEvent = {
    name: Events.GuildBanRemove,

    execute: async (ban: GuildBan) => {
        const user = ban.user;
        if (!user) return;

        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === user.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const reason = log?.reason;
        const executor = log?.executor;

        const guildBanAddEvent: WebhookEvent = {
            id: uuid,
            guild: ban.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildBanRemove,
            embeds: [{
                author: {
                    name: `${user.tag ?? 'Unknown user'}`,
                    iconURL: user.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `User ${user} was unbanned`,
                fields: [
                    { name: 'User', value: `${user} | **${user.tag}**` },
                    { name: 'Reason', value: `${reason ?? '`<None>`'}` },
                    { name: 'ID', value: `\`\`\`ini\nExecutor=${executor?.id ?? '???'}\nUser=${user?.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x74FD77,
                timestamp: new Date().toISOString()
            }]
        };

        await webhookSend(guildBanAddEvent);
    }
};

export default event;