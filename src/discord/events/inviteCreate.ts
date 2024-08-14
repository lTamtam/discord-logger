import { AuditLogEvent, Events, Guild, Invite } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { getMember } from '../../utils/helpers';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'inviteCreate';

const event: BotEvent = {
    name: Events.InviteCreate,

    execute: async (invite: Invite) => {
        if (!invite.guild) return;

        const guild = invite.guild as Guild;
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.InviteCreate, limit: 1 }).catch(err => { });
        const log = logs?.entries.find(e => e && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(guild, user?.id);

        const inviteCreateEvent: WebhookEvent = {
            id: uuid,
            guild: guild,
            eventName: eventName,
            timestamp: new Date(),
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Invite was created`,
                fields: [
                    { name: 'Code', value: `${invite.code}` },
                    { name: 'Expiration date', value: invite.expiresTimestamp ? `<t:${Math.round(invite.expiresTimestamp / 1000)}>` : '∞' },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x6577E6
            }],
        };

        await webhookSend(inviteCreateEvent);
    }
};

export default event;