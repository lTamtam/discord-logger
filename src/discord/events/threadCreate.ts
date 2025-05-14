import { AnyThreadChannel, AuditLogEvent, ChannelType, Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { CHANNEL, EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'threadCreate';

const event: BotEvent = {
    name: Events.ThreadCreate,

    execute: async (thread: AnyThreadChannel, newlyCreated: boolean) => {
        if (newlyCreated && thread.type !== ChannelType.AnnouncementThread && thread.type !== ChannelType.PublicThread && thread.type !== ChannelType.PrivateThread) return;

        const logs = await thread.guild.fetchAuditLogs({ type: AuditLogEvent.ThreadCreate, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === thread.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(thread.guild, user?.id);

        const threadCreateEvent: WebhookEvent = {
            id: uuid,
            guild: thread.guild,
            name: eventName,
            bits: EVENTS_BITS.ThreadCreate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${CHANNEL[thread.type]} ${thread} was created`,
                fields: [
                    { name: 'Name', value: thread.name },
                    { name: 'Parent channel', value: `${thread.parent} (#${thread.parent?.name})` },
                    { name: 'ID', value: `\`\`\`ini\nUser=${user?.id ?? '???'}\nThread=${thread.id}\nParent=${thread.parent?.id}\`\`\`` }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFCA82A,
                timestamp: new Date().toISOString()
            }]
        };

        await webhookSend(threadCreateEvent);
    }
};

export default event;