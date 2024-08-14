import { AuditLogEvent, Events, PermissionResolvable, PermissionsBitField, Role } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { getMember } from '../../utils/helpers';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildRoleCreate';

const event: BotEvent = {
    name: Events.GuildRoleCreate,

    execute: async (role: Role) => {
        const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === role.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(role.guild, user?.id);
        const auto = role.managed;

        const guildRoleCreateEvent: WebhookEvent = {
            id: uuid,
            guild: role.guild,
            eventName: eventName,
            timestamp: new Date(),
            embeds: [{
                author: {
                    name: `${auto ? 'Discord' : user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: auto ? Bun.env.USER_DEFAULT_AVATAR! : user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${auto ? 'Managed role' : 'Role'} ${role} was created`,
                fields: [
                    { name: 'Name', value: role.name },
                    { name: 'Permissions', value: (Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(role.permissions).has(p as PermissionResolvable)).map(s => `✅ ${s}`).join('\n') ?? '\`<None>\`' },
                    { name: 'ID', value: `\`\`\`ini\n${auto ? '' : `Executor=${user?.id ?? '???'}\n`}Role=${role.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x1BE9A3
            }]
        };

        await webhookSend(guildRoleCreateEvent);
    }
};

export default event;