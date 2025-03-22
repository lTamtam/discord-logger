import { AuditLogEvent, Events, PartialRoleData, PermissionResolvable, PermissionsBitField, Role } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getDifference, getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildRoleUpdate';

const event: BotEvent = {
    name: Events.GuildRoleUpdate,

    execute: async (oldRole: Role | PartialRoleData, role: Role) => {
        if (role.position !== oldRole.position) return;

        const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === role.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(role.guild, user?.id);
        const oldPermissions = Object.keys(PermissionsBitField.Flags).filter(p => new PermissionsBitField(oldRole.permissions).has(p as PermissionResolvable));
        const newPermissions = Object.keys(PermissionsBitField.Flags).filter(p => new PermissionsBitField(role.permissions).has(p as PermissionResolvable));
        const added = getDifference(oldPermissions, newPermissions);
        const removed = getDifference(newPermissions, oldPermissions);

        const guildRoleUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: role.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildRoleUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Role ${role} (@${role.name}) was updated`,
                fields: [
                    { name: 'Creation date', value: `<t:${Math.round(role.createdTimestamp! / 1000)}:F>` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x65FDFC,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => guildRoleUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        log?.changes.forEach(c => {
            if (c.key === 'name') addField('Name', `**Now:** ${c.new}\n**Was:** ${c.old}`);
            if (c.key === 'color') addField('Color', `**Now:** \`#${c.new?.toString(16)}\`\n**Was:** \`#${c.old?.toString(16)}\``);
            if (c.key === 'hoist') addField('Hoisted', `**Now:** ${c.new}\n**Was:** ${c.old}`);
            if (c.key === 'mentionable') addField('Mentionnable', `**Now:** ${c.new}\n**Was:** ${c.old}`);
            if (c.key === 'icon_hash') {
                addField('Icon URL', `**Now:** ${role.iconURL()}`);
                guildRoleUpdateEvent.embeds[0].thumbnail = { url: role.iconURL()! };
            };
        });

        if (added.length || removed.length) {
            addField('Permissions changes', `${added.map(s => `✅ ${s}`).join('\n')}${added.length && removed.length ? '\n' : ''}${removed.map(s => `❌ ${s}`).join('\n')}`)
        }
        if (guildRoleUpdateEvent.embeds[0].fields.length < 2) return;

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nRole=${role.id ?? '???'}\`\`\``);
        await webhookSend(guildRoleUpdateEvent);
    }
};

export default event;