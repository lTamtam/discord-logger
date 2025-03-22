import { AuditLogEvent, Channel, ChannelType, Events, PermissionResolvable, PermissionsBitField } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { CHANNEL, EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'channelCreate';

const event: BotEvent = {
    name: Events.ChannelCreate,

    execute: async (channel: Channel) => {
        if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM || channel.isThread()) return;

        const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === channel.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(channel.guild, user?.id);

        const channelCreateEvent: WebhookEvent = {
            id: uuid,
            guild: channel.guild,
            name: eventName,
            bits: EVENTS_BITS.ChannelCreate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${CHANNEL[channel.type]} ${channel} was created`,
                fields: [
                    { name: 'Name', value: channel.name },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${channel.id ?? '???'}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFD963A,
                timestamp: new Date().toISOString()
            }],
        };

        channel.permissionOverwrites.cache.forEach(o => {
            if (o.type === 0) {
                const role = channel.guild.roles.cache.find(r => r.id === o.id);
                if (role && role.id !== channel.guild.id) {
                    channelCreateEvent.embeds[0].fields.push({
                        name: `Role @${role.name} (${role.id})`,
                        value: `${(Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(o.allow.bitfield).has(p as PermissionResolvable)).map(s => `✅ ALLOW ${s}`).join('\n')}\n${(Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(o.deny.bitfield).has(p as PermissionResolvable)).map(s => `❌ DENY ${s}`).join('\n')}`
                    })
                }
            }
            if (o.type === 1) {
                const user = channel.client.users.cache.find(u => u.id === o.id);
                if (user && user.id !== channel.guild.id) {
                    channelCreateEvent.embeds[0].fields.push({
                        name: `User @${user.tag} (${user.id})`,
                        value: `${(Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(o.allow.bitfield).has(p as PermissionResolvable)).map(s => `✅ ALLOW ${s}`).join('\n')}\n${(Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(o.deny.bitfield).has(p as PermissionResolvable)).map(s => `❌ DENY ${s}`).join('\n')}`
                    })
                }
            }
        });

        await webhookSend(channelCreateEvent);
    }
};

export default event;