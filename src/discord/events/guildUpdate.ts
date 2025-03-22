import { AuditLogEvent, Events, Guild, GuildDefaultMessageNotifications, GuildExplicitContentFilter, GuildMFALevel, GuildVerificationLevel } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, WebhookEvent } from '../../types';
import { EVENTS_BITS, EXPLICIT_CONTENT_LEVELS_MAP, MFA_LEVELS_MAP, NOTIFICATIONS_LEVEL_MAP, VERIFICATION_LEVELS_MAP } from '../../utils/eventsTypemaps';
import { getMember } from '../../utils/util';
import { webhookSend } from '../../utils/webhooks';

const eventName = 'guildUpdate';

const event: BotEvent = {
    name: Events.GuildUpdate,

    execute: async (oldGuild: Guild, guild: Guild) => {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 }).catch(err => { });
        const log = logs?.entries.find(e => new Date().getTime() - e.createdTimestamp < 3000);
        if (!log || !log.changes) return;

        const suuid = short();
        const uuid = suuid.new();
        const user = log.executor;
        const member = await getMember(guild, user?.id);

        const guildUpdateEvent: WebhookEvent = {
            id: uuid,
            guild: guild,
            name: eventName,
            bits: EVENTS_BITS.GuildUpdate,
            embeds: [{
                author: {
                    name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`,
                    iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR!
                },
                description: `Guild was updated`,
                fields: [],
                footer: { text: `ID: ${uuid}` },
                color: 0xA463FF,
                timestamp: new Date().toISOString()
            }]
        };
        const addField = (name: string, value: string) => guildUpdateEvent.embeds[0].fields.push({ name: name, value: value });

        log.changes.forEach(c => {
            switch (c.key) {
                case 'name':
                    addField('Name', `**Now:** ${c.new}\n**Was:** ${c.old}`);
                    break;
                case 'description':
                    addField('Description', `**Now:** ${c.new === '' || !c.new ? '`<None>`' : c.new}\n**Was:** ${c.old ?? '`<None>`'}`);
                    break;
                case 'icon_hash':
                    addField('Icon', `**Now:** [Image](${guild.iconURL() ?? '`<None>`'})\n**Was:** [Image](${oldGuild.iconURL() ?? '`<None>`'})`);
                    break;
                case 'banner_hash':
                    addField('Icon', `**Now:** [Image](${guild.bannerURL() ?? '`<None>`'})\n**Was:** [Image](${oldGuild.bannerURL() ?? '`<None>`'})`);
                    break;
                case 'vanity_url_code':
                    addField('Vanity URL', `**Now:** \`${c.new === '' || !c.new ? '`<None>`' : c.new}\`\n**Was:** \`${c.old ?? '`<None>`'}\``);
                    break;
                case 'verification_level':
                    addField('Verification', `**Now:** ${VERIFICATION_LEVELS_MAP[c.new as GuildVerificationLevel]}\n**Was:** ${VERIFICATION_LEVELS_MAP[c.old as GuildVerificationLevel]}\n`);
                    break;
                case 'explicit_content_filter':
                    addField('Content filter', `**Now:** ${EXPLICIT_CONTENT_LEVELS_MAP[c.new as GuildExplicitContentFilter]}\n**Was:** ${EXPLICIT_CONTENT_LEVELS_MAP[c.old as GuildExplicitContentFilter]}`);
                    break;
                case 'mfa_level':
                    addField('MFA level', `**Now:** ${MFA_LEVELS_MAP[c.new as GuildMFALevel]}\n**Was:** ${MFA_LEVELS_MAP[c.old as GuildMFALevel]}\n`);
                    break;
                case 'nsfw':
                    addField('NSFW level', `**Now:** ${guild.nsfwLevel}\n**Was:** ${oldGuild.nsfwLevel}`);
                    break;

                case 'splash_hash':
                    addField('Server splash', `**Now:** [Image](${guild.splashURL() ?? '`<None>`'})\n**Was:** [Image](${oldGuild.splashURL() ?? '`<None>`'})`);
                    break;
                case 'discovery_splash_hash':
                    addField('Discovery splash', `**Now:** [Image](${guild.discoverySplashURL() ?? '`<None>`'})\n**Was:** [Image](${oldGuild.discoverySplashURL() ?? '`<None>`'})`);
                    break;
                case 'default_message_notifications':
                    addField('Default notifications', `**Now:** ${NOTIFICATIONS_LEVEL_MAP[c.new as GuildDefaultMessageNotifications]}\n**Was:** ${NOTIFICATIONS_LEVEL_MAP[c.old as GuildDefaultMessageNotifications]}`);
                    break;

                case 'afk_channel_id':
                    addField('AFK channel', `**Now:** ${c.new ? `<#${c.new}> (${c.new})` : '`<None>`'}\n**Was:** ${c.old ? `<#${c.old}> (${c.old})` : '`<None>`'}`);
                    break;
                case 'afk_timeout':
                    addField('AFK timeout', `**Now:** **${c.new as number / 60}** minute${c.new as number > 1 ? 's' : ''}\n**Was:** **${c.old as number / 60}** minute${c.new as number > 1 ? 's' : ''}`);
                    break;
                case 'system_channel_id':
                    addField('System channel', `**Now:** ${c.new ? `<#${c.new}> (${c.new})` : '`<None>`'}\n**Was:** ${c.old ? `<#${c.old}> (${c.old})` : '`<None>`'}`);
                    break;
                case 'rules_channel_id':
                    addField('Rules channel', `**Now:** ${c.new ? `<#${c.new}> (${c.new})` : '`<None>`'}\n**Was:** ${c.old ? `<#${c.old}> (${c.old})` : '`<None>`'}`);
                    break;
                case 'widget_channel_id':
                    addField('Widget channel', `**Now:** ${c.new ? `<#${c.new}> (${c.new})` : '`<None>`'}\n**Was:** ${c.old ? `<#${c.old}> (${c.old})` : '`<None>`'}`);
                    break;
                case 'public_updates_channel_id':
                    addField('Public updates channel', `**Now:** ${c.new ? `<#${c.new}> (${c.new})` : '`<None>`'}\n**Was:** ${c.old ? `<#${c.old}> (${c.old})` : '`<None>`'}`);
                    break;
            }
        });
        if (!guildUpdateEvent.embeds[0].fields.length) return;

        addField('ID', `\`\`\`ini\nUser=${user?.id ?? '???'}\nGuild=${guild.id}\`\`\``);
        await webhookSend(guildUpdateEvent);
    }
};

export default event;