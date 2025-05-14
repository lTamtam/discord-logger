import { AnyThreadChannel, AuditLogEvent, ChannelType, Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { CHANNEL, EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'threadUpdate';

const event: BotEvent = {
    name: Events.ThreadUpdate,

    execute: async (oldThread: AnyThreadChannel, thread: AnyThreadChannel) => {
        if (oldThread.type !== ChannelType.AnnouncementThread && oldThread.type !== ChannelType.PublicThread && oldThread.type !== ChannelType.PrivateThread) return;
        if (thread.type !== ChannelType.AnnouncementThread && thread.type !== ChannelType.PublicThread && thread.type !== ChannelType.PrivateThread) return;

        const logs = await thread.guild.fetchAuditLogs({ type: AuditLogEvent.ThreadUpdate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === thread.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(thread.guild, user?.id);

        const threadUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: thread.guild,
            name: eventName,
            bits: EVENTS_BITS.ThreadUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${CHANNEL[thread.type]} ${thread} (#${thread.name}) was updated`,
                fields: [
                    { name: 'Parent channel', value: `${thread.parent} (#${thread.parent?.name ?? '???'})` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFCA82A,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => threadUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        log?.changes.forEach(c => {
            if (c.key === 'name') addField('Name', `**Now:** ${c.new}\n**Was:** ${c.old}`);
            if (c.key === 'archived') addField('Archived', `**Now:** ${c.new ? 'Yes' : 'No'}\n**Was:** ${c.old ? 'Yes' : 'No'}`);
            if (c.key === 'locked') addField('Locked', `**Now:** ${c.new ? 'Yes' : 'No'}\n**Was:** ${c.old ? 'Yes' : 'No'}`);
            if (c.key === 'rate_limit_per_user') addField('Cooldown', `**Now:** **${c.new}** second${c.new as number > 1 ? 's' : ''}\n**Was:** **${c.old}** second${c.old as number > 1 ? 's' : ''}`);
            if (c.key === 'auto_archive_duration') addField('Auto archive', `**Now:** After **${c.new}** second${c.new as number > 1 ? 's' : ''}\n**Was:** After **${c.old}** second${c.old as number > 1 ? 's' : ''}`);
        });

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nThread=${thread.id}\nParent=${thread.parent?.id ?? '???'}\`\`\``);
        await webhookSend(threadUpdateEvent);
    }
};

export default event;