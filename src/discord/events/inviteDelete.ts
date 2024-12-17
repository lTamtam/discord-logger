import { AuditLogEvent, Events, Guild, Invite } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'inviteDelete';

const event: BotEvent = {
    name: Events.InviteDelete,

    execute: async (invite: Invite) => {
        if (!invite.guild) return;

        const guild = invite.guild as Guild;
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 1 }).catch(err => { });
        const log = logs?.entries.find(e => e && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(guild, user?.id);

        const inviteDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: guild,
            name: eventName,
            bits: EVENTS_BITS.InviteDelete,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Invite was deleted`,
                fields: [
                    { name: 'Code', value: `${invite.code}` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                timestamp: new Date().toISOString()
            }],
        };

        await webhookSend(inviteDeleteEvent);
    }
};

export default event;