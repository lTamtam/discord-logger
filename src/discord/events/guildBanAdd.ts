import { AuditLogEvent, Events, GuildBan } from 'discord.js';
import short from 'short-uuid';
import { EMPTY_STRING } from '../../config/constants';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildBanAdd';

const event: BotEvent = {
    name: Events.GuildBanAdd,

    execute: async (ban: GuildBan) => {
        const user = ban.user;
        if (!user) return;

        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 }).catch(err => { });
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
            bits: EVENTS_BITS.GuildBanAdd,
            embeds: [{
                author: {
                    name: `${user.tag ?? 'Unknown user'}`,
                    iconURL: user.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `User ${user} was banned`,
                fields: [
                    { name: 'User', value: `${user} | **${user.tag}**` },
                    { name: 'Reason', value: `${reason ?? EMPTY_STRING}` },
                    { name: 'ID', value: `\`\`\`ini\nExecutor=${executor?.id ?? '???'}\nUser=${user?.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xF54831,
                timestamp: new Date().toISOString()
            }]
        };

        await webhookSend(guildBanAddEvent);
    }
};

export default event;