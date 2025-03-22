import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getDifference, getUser } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildMemberUpdate';

const event: BotEvent = {
    name: Events.GuildMemberUpdate,

    execute: async (oldMember: GuildMember | PartialGuildMember, member: GuildMember | PartialGuildMember) => {
        // 0 | AuditLogEvent.MemberUpdate | AuditLogEvent.MemberRoleUpdate
        let auditLogId: 0 | 24 | 25 = 0;
        const addedRoles = getDifference([...oldMember.roles.cache.keys()], [...member.roles.cache.keys()]);
        const removedRoles = getDifference([...member.roles.cache.keys()], [...oldMember.roles.cache.keys()]);
        const timeout = member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > new Date().getTime() && (!oldMember.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp !== oldMember.communicationDisabledUntilTimestamp);

        if (member.nickname !== oldMember.nickname || timeout) auditLogId = 24;
        else if (addedRoles.length || removedRoles.length) auditLogId = 25;
        if (!auditLogId) return;

        const logs = await member.guild.fetchAuditLogs({ type: auditLogId, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === member.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const executor = log.executor;
        const user = await getUser(member.guild, member.id);

        const guildMemberUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: member.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildMemberUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Guild member ${user} was ${timeout ? 'timed out' : 'updated'}`,
                fields: [
                    { name: 'User', value: `${user} | **${user?.tag ?? '???'}**` },
                    { name: 'Joined at', value: `<t:${Math.round(member.joinedTimestamp! / 1000)}:F>` },
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x0F63F9,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => guildMemberUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        if (auditLogId === 24) {
            log.changes.forEach(c => {
                if (c.key === 'nick') addField('Nickname', `**Now:** ${c.new ?? '`<None>`'}\n**Was:** ${c.old ?? '`<None>`'}`);
                if (c.key === 'communication_disabled_until') addField('Timeout', `**Until:** <t:${Math.round(member.communicationDisabledUntilTimestamp! / 1000)}> (<t:${Math.round(member.communicationDisabledUntilTimestamp! / 1000)}:R>)`)
            });
            if (timeout) guildMemberUpdateEvent.embeds[0].color = 0xF54831;
        }
        else {
            addField(`Roles`, `${addedRoles.map(a => `➕ <@&${a}> (${a})`).join('\n')}\n${removedRoles.map(r => `❌ <@&${r}> (${r})`).join('\n')}`);
        }

        addField('ID', `\`\`\`ini${user !== executor ? `\nExecutor=${executor?.id ?? '???'}` : ''}\nMember=${member.id ?? '???'}\`\`\``);
        await webhookSend(guildMemberUpdateEvent);
    }
};

export default event;