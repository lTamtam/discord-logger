import { AuditLogChange, AuditLogEvent, AutoModerationRule, Events } from 'discord.js';
import short from 'short-uuid';
import { EMPTY_STRING } from '../../config/constants';
import { APIAutomodActions, APIAutomodAllow, APIAutomodKeyword, APIAutomodRegex, APIAutomodTrigger, BotEvent, WebhookEvent } from '../../types';
import { AUTOMOD_TRIGGER, EVENTS_BITS } from '../../utils/events-typemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'autoModerationRuleUpdate';

const event: BotEvent = {
    name: Events.AutoModerationRuleUpdate,

    execute: async (oldRule: AutoModerationRule, rule: AutoModerationRule) => {
        const logs = await rule.guild.fetchAuditLogs({ type: AuditLogEvent.AutoModerationRuleUpdate, limit: 5 }).catch(err => { });
        let log = logs?.entries.find(e => e.targetId === rule.id && new Date().getTime() - e.createdTimestamp < 3000);
        if (!log || !log.changes) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(rule.guild, user?.id);
        const extendedLog = logs?.entries.filter(e => e.targetId === rule.id && e.executorId === user?.id && new Date().getTime() - e.createdTimestamp < 3000).map(l => l.changes).flat();

        const automoderationRuleUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: rule.guild,
            name: eventName,
            bits: EVENTS_BITS.AutoModerationRuleUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `${AUTOMOD_TRIGGER[rule.triggerType]} automod rule was updated`,
                fields: [],
                footer: { text: `ID: ${uuid}` },
                color: 0x8DBCBE,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => automoderationRuleUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        extendedLog?.forEach((c: AuditLogChange | APIAutomodKeyword | APIAutomodRegex | APIAutomodAllow) => {
            if (c.key === 'name') addField('Name', `**Now:** ${c.new}\n**Was:** ${c.old}`);
            if (c.key === 'actions') {
                let actions = (c as APIAutomodActions).new.map(a => a.type === 1 ? '• Block message' : a.type === 2 ? `• Send alert in <#${a.metadata.channel_id}>` : `• Set timeout for **${a.metadata.duration_seconds}**s`);
                if (!actions.length) actions = [EMPTY_STRING];
                let oldActions = (c as APIAutomodActions).new.map(a => a.type === 1 && a.metadata.custom_message !== undefined ? '• Block message' : a.type === 2 && a.metadata.channel_id !== undefined ? `• Send alert in <#${a.metadata.channel_id}>` : a.type === 3 && a.metadata.duration_seconds !== undefined ? `• Set timeout for **${a.metadata.duration_seconds}**s` : '');
                if (!oldActions.length) actions = [EMPTY_STRING];
                if (actions.toString() !== oldActions.toString()) addField('Actions', `**Now**\n${actions.join('\n')}\n**Was**\n${oldActions.join('\n')}`);
            }
            if (c.key === '$add_keyword_filter' && c.new) {
                addField(`Added keywords`, `\`\`\`${c.new.map(k => k).join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
            }
            if (c.key === '$remove_keyword_filter') {
                addField(`Removed keywords`, `\`\`\`${c.new.map(k => k).join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
            }
            if (c.key === '$add_regex_patterns') {
                addField(`Added regexes`, `\`\`\`${c.new.map(k => `\`${k.replace(/`/g, '')}\``).join(' ').replace(/\"/g, '"')}\`\`\``);
            }
            if (c.key === '$remove_regex_patterns') {
                addField(`Removed regexes`, `\`\`\`${c.new.map(k => `\`${k.replace(/`/g, '')}\``).join(' ').replace(/\"/g, '"')}\`\`\``);
            }
            if (c.key === '$add_allow_list') {
                addField(`Added allowed words`, `\`\`\`${c.new.map(k => k).join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
            }
            if (c.key === '$remove_allow_list') {
                addField(`Removed allowed words`, `\`\`\`${c.new.map(k => k).join(', ').replace(/\"/g, '"').replace(/`/g, '')}\`\`\``);
            }
            if (c.key === 'trigger_metadata') {
                if ((c as APIAutomodTrigger).new.mention_total_limit !== (c as APIAutomodTrigger).old.mention_total_limit) addField('Mentions limit', `**Now: ${(c as APIAutomodTrigger).new.mention_total_limit}**\n**Was: ${(c as APIAutomodTrigger).old.mention_total_limit}**`);
                if ((c as APIAutomodTrigger).new.mention_raid_protection_enabled !== (c as APIAutomodTrigger).old.mention_raid_protection_enabled) addField('Mentions raid protection', `${(c as APIAutomodTrigger).new.mention_raid_protection_enabled ? '✅ Enabled' : '❌ Disabled'}`);
            }
            if (c.key === 'exempt_channels') addField('Exempt channels', `**Now**\n${c.new === undefined ? EMPTY_STRING : c.new.map(r => `<#${r}> (${r})`).join('\n')}\n**Was**\n${c.old === undefined ? EMPTY_STRING : c.old.map(r => `<#${r}> (${r})`).join('\n')}`);
            if (c.key === 'exempt_roles') addField('Exempt roles', `**Now**\n${c.new === undefined ? EMPTY_STRING : c.new.map(r => `<@&${r}> (${r})`).join('\n')}\n**Was**\n${c.old === undefined ? EMPTY_STRING : c.old.map(r => `<@&${r}> (${r})`).join('\n')}`);
        });
        if (!automoderationRuleUpdateEvent.embeds[0].fields.length) return;

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nRule=${rule.id ?? '???'}\`\`\``);
        await webhookSend(automoderationRuleUpdateEvent);
    }
};

export default event;