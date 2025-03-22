import { AuditLogEvent, Events, VoiceState } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS } from '../../utils/eventsTypemaps';
import { getUser } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'voiceStateUpdate';

const event: BotEvent = {
    name: Events.VoiceStateUpdate,

    execute: async (oldState: VoiceState, newState: VoiceState) => {
        if (oldState.channel === newState.channel && oldState.serverMute === newState.serverMute && oldState.serverDeaf === newState.serverDeaf) return;

        const member = newState.member;
        const user = await getUser(newState.guild, member);
        if (!user) return;

        const logs = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === newState.id && new Date().getTime() - e.createdTimestamp < 3000);

        const suuid = short();
        const uuid = suuid.new();
        const executor = log?.executor;

        const voiceStateUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: newState.guild,
            name: eventName,
            bits: EVENTS_BITS.VoiceStateUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: ``,
                fields: [],
                footer: { text: `ID: ${uuid}` },
                color: 0x74FD77,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => voiceStateUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        if (!oldState.channel && newState.channel) {
            voiceStateUpdateEvent.embeds[0].color = 0x74FD77;
            voiceStateUpdateEvent.embeds[0].description = `**${user}** ${member && member.nickname ? `(${member.nickname})` : ''} joined a voice channel`;
            addField('Channel', `${newState.channel} (#${newState.channel.name})`);
            addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${newState.channel.id}\`\`\``);
        }
        else if (oldState.channel && !newState.channel) {
            voiceStateUpdateEvent.embeds[0].color = 0xFE544A;
            voiceStateUpdateEvent.embeds[0].description = `**${user}** ${member && member.nickname ? `(${member.nickname})` : ''} left a voice channel`;
            addField('Channel', `${oldState.channel} (#${oldState.channel.name})`);
            addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nChannel=${oldState.channel.id}\`\`\``);
        }
        else if (oldState.channel && newState.channel && oldState.channel !== newState.channel) {
            voiceStateUpdateEvent.embeds[0].description = `**${user}** ${member && member.nickname ? `(${member.nickname})` : ''} switched voice channel`;
            addField('Channel', `**Now:** ${newState.channel} (#${newState.channel?.name})\n**Was:** ${oldState.channel} (#${oldState.channel?.name})`);
            addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nNew channel=${newState.channel?.id}\nOld channel=${oldState.channel?.id}\`\`\``);
        }

        if (log) log.changes.forEach(c => {
            if (c.key === 'mute') {
                voiceStateUpdateEvent.embeds[0].color = 0xFE544A;
                voiceStateUpdateEvent.embeds[0].description = `**${user}** was ${c.new === true ? 'muted' : 'unmuted'}`;
                addField('ID', `\`\`\`ini\nExecutor=${executor?.id ?? '???'}\nUser=${user?.id ?? '???'}\nChannel=${newState.channel?.id ?? '???'}\`\`\``);
            }
            if (c.key === 'deaf') {
                voiceStateUpdateEvent.embeds[0].color = 0xFE544A;
                voiceStateUpdateEvent.embeds[0].description = `**${user}** was ${c.new === true ? 'deafened' : 'undeafened'}`;
                addField('ID', `\`\`\`ini\nExecutor=${executor?.id ?? '???'}\nUser=${user?.id ?? '???'}\nChannel=${newState.channel?.id ?? '???'}\`\`\``);
            }
        });

        if (!voiceStateUpdateEvent.embeds[0].fields.length) return;
        await webhookSend(voiceStateUpdateEvent);
    }
};

export default event;