import { BaseGuildTextChannel, BaseGuildVoiceChannel, Channel, ChannelType, Events } from 'discord.js';
import short from 'short-uuid';
import { EMPTY_STRING } from '../../config/constants';
import { BotEvent, WebhookEvent } from '../../types';
import { CHANNEL, EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'channelUpdate';

const event: BotEvent = {
    name: Events.ChannelUpdate,

    execute: async (oldChannel: Channel, channel: Channel) => {
        if (oldChannel.type === ChannelType.DM || oldChannel.type === ChannelType.GroupDM || oldChannel.isThread() || channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM || channel.isThread() || channel.position !== oldChannel.position) return;

        // 0 | AuditLogEvent.ChannelUpdate | AuditLogEvent.ChannelOverwriteUpdate
        let auditLogId: 0 | 11 | 14 = 0;

        /**https://gist.github.com/jaw0r3k/b4befbad76142f324ab90719a9595b8c*/
        const permissionOverwritesChanges = [...oldChannel.permissionOverwrites.cache.keys(), ...channel.permissionOverwrites.cache.keys()]
            .reduce((out, next) => (out.includes(next) ? out : out.concat(next)), [] as string[])
            .map(id => ({ id, before: oldChannel.permissionOverwrites.cache.get(id), after: channel.permissionOverwrites.cache.get(id) }))
            .map(({ id, before, after }) => ({
                id,
                type: before ? before.type : after?.type,
                added: !after ? [] : (before ? after.allow.remove(before.allow) : after.allow).toArray(),
                denied: !after ? [] : (before ? after.deny.remove(before.deny) : after.deny).toArray(),
                removed: !before ? [] : [...before.allow.toArray(), ...before.deny.toArray()].filter((it) => (after ? ![...after.allow.toArray(), ...after.deny.toArray()].includes(it) : true))
            }))
            .filter(({ removed, added, denied }) => removed.length || added.length || denied.length);

        if (permissionOverwritesChanges.length) auditLogId = 14;
        else {
            switch (true) {
                case channel instanceof BaseGuildTextChannel && oldChannel instanceof BaseGuildTextChannel:
                    if (channel.name !== oldChannel.name
                        || channel.topic !== oldChannel.topic
                        || channel.rateLimitPerUser !== oldChannel.rateLimitPerUser
                        || channel.nsfw !== oldChannel.nsfw
                    ) auditLogId = 11;
                    break;
                case channel instanceof BaseGuildVoiceChannel && oldChannel instanceof BaseGuildVoiceChannel:
                    if (channel.name !== oldChannel.name
                        || channel.rateLimitPerUser !== oldChannel.rateLimitPerUser
                        || channel.nsfw !== oldChannel.nsfw
                        || channel.bitrate !== oldChannel.bitrate
                        || channel.userLimit !== oldChannel.userLimit
                    ) auditLogId = 11;
                    break;
                default: 0;
            }
        }

        if (!auditLogId) return;
        const logs = await channel.guild.fetchAuditLogs({ type: auditLogId, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === channel.id);
        if (!log || !log?.changes) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(channel.guild, user?.id);

        const channelUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: channel.guild,
            name: eventName,
            bits: EVENTS_BITS.ChannelUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${CHANNEL[channel.type]} ${channel} (#${channel.name}) was updated`,
                fields: [
                    { name: 'Creation date', value: `<t:${Math.round(channel.createdTimestamp! / 1000)}:F>` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFD963A,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => channelUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        if (auditLogId === 11) {
            log.changes.forEach(c => {
                if (c.key === 'name') addField('Name', `**Now:** ${c.new}\n**Was:** ${c.old}`);
                if (c.key === 'topic') addField('Topic', `**Now:** \`${c.new ? (c.new as string).replace(/\"/g, '"').replace(/`/g, '') : EMPTY_STRING}\`\n**Was:** \`${c.old ? (c.old as string).replace(/\"/g, '"').replace(/`/g, '') : EMPTY_STRING}\``);
                if (c.key === 'rate_limit_per_user') addField('Cooldown', `**Now:** **${c.new}** second${c.new as number > 1 ? 's' : ''}\n**Was:** **${c.old}** second${c.new as number > 1 ? 's' : ''}`);
                if (c.key === 'nsfw') addField('Nsfw', `**Now:** ${c.new}\n**Was:** ${c.old}`);
                if (c.key === 'bitrate') addField('Bitrate', `**Now:** **${c.new}** kbps\n**Was:** **${c.old}** kbps`);
                if (c.key === 'user_limit') addField('User limit', `**Now:** ${c.new}\n**Was:** ${c.old}`)
            });
        }
        else {
            permissionOverwritesChanges.map(o => {
                addField(`${o.type === 0 ? `Role @${channel.guild.roles.cache.get(o.id)?.name ?? ''} (${o.id})` : `User @${channel.client.users.cache.get(o.id)?.tag ?? ''} (${o.id})`}`, `${o.added.map(a => `✅ ALLOW ${a}`).join('\n')}\n${o.denied.map(d => `❌ DENY ${d}`).join('\n')}\n${o.removed.map(r => `⚖️ NEUTRAL ${r}`).join('\n')}`);
            });
        }

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${channel.id ?? '???'}\`\`\``);
        await webhookSend(channelUpdateEvent);
    }
};

export default event;