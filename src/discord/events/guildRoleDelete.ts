import { AuditLogEvent, Events, PermissionResolvable, PermissionsBitField, Role } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildRoleDelete';

const event: BotEvent = {
    name: Events.GuildRoleDelete,

    execute: async (role: Role) => {
        const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === role.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(role.guild, user?.id);
        const auto = role.managed;
        const permissions = (Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(role.permissions).has(p as PermissionResolvable)).map(s => `✅ ${s}`).join('\n');

        const guildRoleDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: role.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildRoleDelete,
            embeds: [{
                author: {
                    name: `${auto ? 'Discord' : user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: auto ? Bun.env.USER_DEFAULT_AVATAR! : user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${auto ? 'Managed role' : 'Role'} @${role.name} was deleted`,
                fields: [
                    { name: 'Name', value: role.name },
                    { name: 'Color', value: role.hexColor },
                    { name: 'Permissions', value: permissions ? permissions : '`<None>`' }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => guildRoleDeleteEvent.embeds[0].fields.push({ name: name, value: value });

        if (role.icon) {
            addField('Icon URL', `${role.iconURL()}`);
            guildRoleDeleteEvent.embeds[0].thumbnail = { url: role.iconURL()! };
        }

        addField('ID', `\`\`\`ini\n${auto ? '' : `Executor=${user?.id ?? '???'}\n`}Role=${role.id ?? '???'}\`\`\``);
        await webhookSend(guildRoleDeleteEvent);
    }
};

export default event;