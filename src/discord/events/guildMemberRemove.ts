import { AuditLogEvent, Events, GuildMember } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildMemberRemove';

const event: BotEvent = {
    name: Events.GuildMemberRemove,

    execute: async (member: GuildMember) => {
        const user = await member.client.users.fetch(member).catch(err => null);
        if (!user) return;

        const suuid = short();
        const uuid = suuid.new();
        const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === user.id && new Date().getTime() - e.createdTimestamp < 3000);
        const kick = !!log;
        const executor = log?.executor;

        const guildMemberRemoveEvent: WebhookEvent = {
            id: uuid,
            guild: member.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildMemberRemove,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${user.bot ? 'Bot' : 'User'} ${user} ${kick ? 'was kicked' : 'left the server'}`,
                fields: [
                    { name: 'User', value: `${user} | **${user.tag}** ${member && member.nickname ? `| ${member.nickname}` : ''}` },
                    { name: 'Creation date', value: `<t:${Math.round(user.createdTimestamp! / 1000)}:F>`, inline: true }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                timestamp: new Date().toISOString()
            }]
        };
        if (member.joinedTimestamp) guildMemberRemoveEvent.embeds[0].fields.push({ name: 'Joined at', value: `<t:${Math.round(member.joinedTimestamp / 1000)}:F>`, inline: true });

        const roles = member.roles.cache.filter(r => r.id !== member.guild.id);
        if (roles.size) {
            const maxRoles = 125;
            const maxFieldRoles = 20;
            const rolesList = roles.sort((a, b) => b.rawPosition - a.rawPosition).map(r => `${r} ${r.id}`).slice(0, maxRoles);
            if (rolesList.length === maxRoles) rolesList.push(`**...+${roles.size - maxRoles}**`);
            let chunks: string[][] = [];
            for (let i = 0; i < rolesList.length; i += maxFieldRoles) {
                const chunk = rolesList.slice(i, i + maxFieldRoles);
                chunks.push(chunk);
            }

            chunks.forEach((c: string[], i) => {
                guildMemberRemoveEvent.embeds[0].fields.push({
                    name: `Roles ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}`,
                    value: c.join('\n')
                })
            });
        }

        guildMemberRemoveEvent.embeds[0].fields.push({ name: 'ID', value: `\`\`\`ini\n${kick ? `Executor=${executor?.id ?? '???'}\n` : ''}${user.bot ? 'Bot' : 'User'}=${user.id ?? '???'}\`\`\`` });
        await webhookSend(guildMemberRemoveEvent);
    }
};

export default event;