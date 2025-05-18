import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import { EVENTS_BITS } from '../../utils/events-typemaps';
import logger from '../../utils/pino-logger';
import { errorEmbed } from '../../utils/util';
import { createWebhook, deleteWebhook, editDbWebhook, editDiscordWebhook, getWebhook } from '../../utils/webhooks';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Logging setup command')
        .addSubcommand(subcommand =>
            subcommand.setName('add-webhook')
                .setDescription('Creates a webhook in a given channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                        .setDescription('Target #channel')
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('view-webhook')
                .setDescription('Shows information about the log webhook')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('edit-webhook')
                .setDescription('Change the log webhook settings')
                .addChannelOption(option =>
                    option.setName('channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                        .setDescription('New target #channel')
                )
                .addIntegerOption(option =>
                    option.setName('events')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Default (All)', value: EVENTS_BITS.Default },
                            { name: 'Guild updates (Global updates & Roles)', value: EVENTS_BITS.Guild + EVENTS_BITS.GuildRole + EVENTS_BITS.Invite },
                            { name: 'Moderation (Automod & Bans + Member updates)', value: EVENTS_BITS.AutoModeration + EVENTS_BITS.GuildBan + EVENTS_BITS.GuildMember },
                            { name: 'Channels & Threads', value: EVENTS_BITS.Channel + EVENTS_BITS.Thread },
                            { name: 'Guild activity (Messages & Voice)', value: EVENTS_BITS.Message + EVENTS_BITS.Voice },
                            { name: 'Guild Expressions (Emojis & Stickers)', value: EVENTS_BITS.GuildEmoji + EVENTS_BITS.GuildSticker },
                            { name: 'None', value: EVENTS_BITS.None }
                        )
                        .setDescription('Events to log')
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('delete-webhook')
                .setDescription('Removes a webhook from the server and the database')
        ),

    cooldown: 10,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        if (!ctx.inCachedGuild()) return;
        const subcommand = ctx.options.getSubcommand();

        if (subcommand === 'add-webhook') {
            const channel = ctx.options.getChannel('channel') ?? ctx.channel;
            if (!channel || channel.type !== ChannelType.GuildText) return errorEmbed(ctx, `${channel} is not a valid channel`, uuid);

            let webhook = await getWebhook(ctx.guild);
            if (webhook?.channelId === channel.id) {
                return errorEmbed(ctx, `This webhook already exists`, uuid);
            }
            else if (webhook && webhook.channelId !== channel.id) {
                const discord = await editDiscordWebhook(webhook, { channel: channel });
                if (!discord) return errorEmbed(ctx, `Discord error when editing the webhook`, uuid);
                const db = await editDbWebhook(webhook, { channelId: channel.id });
                if (!db) return errorEmbed(ctx, `Database error when editing the webhook`, uuid);
            }
            else {
                webhook = await createWebhook(channel);
                if (!webhook) return errorEmbed(ctx, `Error when creating the webhook`, uuid);
            }

            const embed = new EmbedBuilder()
                .setColor(0x2DFA60)
                .setDescription(`🔨 Webhook created in ${channel}`)
                .setFooter({ text: `ID: ${uuid}` });

            try {
                await ctx.reply({ embeds: [embed] });
            }
            catch (err) {
                logger.error({
                    app: 'Bot',
                    command: `${command.data.name} ${subcommand}`,
                    err: err
                });
            }
        }

        else if (subcommand === 'view-webhook') {
            const webhook = await getWebhook(ctx.guild);
            if (!webhook) return errorEmbed(ctx, `There is no webhook on this server`, uuid);

            const embed = new EmbedBuilder()
                .setColor(0x50EFFB)
                .setDescription(`
                    **Log webhook of ${ctx.guild.name}**
                    \n**ID:** \`${webhook.id}\`
                    **Channel:** <#${webhook.channelId}> \`${webhook.channelId}\`
                    \n**Created on** <t:${Math.round(webhook.createdAt.getTime() / 1000)}>
                    \n\* *To remove that webhook, use \`/logs delete-webhook\`*
                `)
                .setFooter({ text: `ID: ${uuid}` });

            try {
                await ctx.reply({ embeds: [embed] });
            }
            catch (err) {
                logger.error({
                    app: 'Bot',
                    command: `${command.data.name} ${subcommand}`,
                    err: err
                });
            }
        }

        else if (subcommand === 'edit-webhook') {
            const webhook = await getWebhook(ctx.guild);
            if (!webhook) return errorEmbed(ctx, `There is no webhook on this server`, uuid);

            const channel = ctx.options.getChannel('channel') as TextChannel;
            const events = ctx.options.getInteger('events');

            if (channel) {
                await editDiscordWebhook(webhook, { channel });
                await editDbWebhook(webhook, { channelId: channel.id });
            }
            if (events) {
                await editDbWebhook(webhook, { events });
            }

            const embed = new EmbedBuilder()
                .setColor(0x2DFA60)
                .setDescription(`🔨 Webhook \`${webhook.id}\` edited`)
                .setFooter({ text: `ID: ${uuid}` });

            try {
                await ctx.reply({ embeds: [embed] });
            }
            catch (err) {
                logger.error({
                    app: 'Bot',
                    command: `${command.data.name} ${subcommand}`,
                    err: err
                });
            }
        }

        else if (subcommand === 'delete-webhook') {
            const webhook = await getWebhook(ctx.guild);
            if (!webhook) return errorEmbed(ctx, `There is no webhook on this server`, uuid);

            await deleteWebhook(ctx.guild);

            const embed = new EmbedBuilder()
                .setColor(0x2DFA60)
                .setDescription(`🗑️ Webhook \`${webhook.id}\` deleted`)
                .setFooter({ text: `ID: ${uuid}` });

            try {
                await ctx.reply({ embeds: [embed] });
            }
            catch (err) {
                logger.error({
                    app: 'Bot',
                    command: `${command.data.name} ${subcommand}`,
                    err: err
                });
            }
        }
    }
};

export default command;