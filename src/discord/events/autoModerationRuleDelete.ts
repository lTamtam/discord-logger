import { AuditLogEvent, AutoModerationRule, Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { AUTOMOD_TRIGGER, EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'autoModerationRuleDelete';

const event: BotEvent = {
    name: Events.AutoModerationRuleDelete,

    execute: async (rule: AutoModerationRule) => {
        const logs = await rule.guild.fetchAuditLogs({ type: AuditLogEvent.AutoModerationRuleDelete, limit: 5 }).catch(err => { });
        const log = logs?.entries.find(e => e.targetId === rule.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(rule.guild, user?.id);

        const automoderationRuleDeleteEvent: WebhookEvent = {
            id: uuid,
            guild: rule.guild,
            name: eventName,
            bits: EVENTS_BITS.AutoModerationRuleDelete,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${AUTOMOD_TRIGGER[rule.triggerType]} automod rule was deleted`,
                fields: [
                    { name: 'Name', value: rule.name }
                ],
                footer: { text: `ID: ${uuid}` },
                color: 0xFE544A,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => automoderationRuleDeleteEvent.embeds[0].fields.push({ name: name, value: value });

        const actions = rule.actions.map(a => a.type === 1 ? '• Block message' : a.type === 2 ? `• Send alert in <#${a.metadata.channelId}>` : `• Set timeout for **${a.metadata.durationSeconds}**s`);
        if (actions.length) addField('Actions', `${actions.join('\n')}`);

        if (rule.triggerMetadata.keywordFilter.length) addField('Keywords', `\`\`\`${rule.triggerMetadata.keywordFilter.join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
        if (rule.triggerMetadata.regexPatterns.length) addField('Regex patterns', `${rule.triggerMetadata.regexPatterns.map(r => `\`${r.replace(/`/g, '')}\``).join(' ').replace(/\"/g, '"')}`);
        if (rule.triggerMetadata.presets.length) addField('Preset keywords', `**Categories:** ${rule.triggerMetadata.presets.map(p => p === 1 ? 'Profanity' : p === 2 ? 'Sexual content' : p === 3 ? 'Slurs' : '').join(', ')}`);
        if (rule.triggerMetadata.allowList.length) addField('Allowed keywords', `\`\`\`${rule.triggerMetadata.allowList.join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
        if (rule.triggerMetadata.mentionTotalLimit) addField('Mentions limit', `**${rule.triggerMetadata.mentionTotalLimit}**`);
        if (rule.triggerMetadata.mentionRaidProtectionEnabled) addField('Mentions raid protection', `✅ Enabled`);

        if (rule.exemptRoles.size) addField('Exempt roles', `${rule.exemptRoles.map(r => `${r} (${r.id})`).join('\n')}`);
        if (rule.exemptChannels.size) addField('Exempt channels', `${rule.exemptChannels.map(c => `${c} (${c.id})`).join('\n')}`);

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nRule=${rule.id ?? '???'}\`\`\``);
        await webhookSend(automoderationRuleDeleteEvent);
    }
};

export default event;