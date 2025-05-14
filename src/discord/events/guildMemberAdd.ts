import { AuditLogEvent, Events, GuildMember } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildMemberAdd';

const event: BotEvent = {
    name: Events.GuildMemberAdd,

    execute: async (member: GuildMember) => {
        const user = await member.client.users.fetch(member).catch(err => null);
        if (!user) return;

        const suuid = short();
        const uuid = suuid.new();

        const guildMemberAddEvent: WebhookEvent = {
            id: uuid,
            guild: member.guild,
            name: eventName,
            bits: EVENTS_BITS.GuildMemberAdd,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${user.bot ? 'Bot' : 'User'} ${user} joined the server`,
                fields: [
                    { name: 'User', value: `${user} | **${user.tag}**` },
                    { name: 'Creation date', value: `<t:${Math.round(user.createdTimestamp! / 1000)}:F>`, inline: true },
                    { name: 'Joined at', value: `<t:${Math.round(member.joinedTimestamp! / 1000)}:F>`, inline: true },
                    { name: 'Guild members count', value: `\`${member.guild.memberCount}\`` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0x74FD77,
                timestamp: new Date().toISOString()
            }]
        };

        if (user.bot) {
            const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 }).catch(err => { });
            const log = logs?.entries.find(e => e.targetId === member.id && new Date().getTime() - e.createdTimestamp < 3000);
            if (!log) return;
            const executor = log.executor;
            guildMemberAddEvent.embeds[0].fields[3] = { name: 'Added by', value: `${executor} | **${executor?.tag}**` };
            guildMemberAddEvent.embeds[0].fields[4] = { name: 'Guild members count', value: `\`${member.guild.memberCount}\`` };
            guildMemberAddEvent.embeds[0].fields.push({ name: 'ID', value: `\`\`\`ini\nUser=${executor?.id ?? '???'}\nBot=${member?.id ?? '???'}\`\`\`` })
        }

        await webhookSend(guildMemberAddEvent);
    }
};

export default event;