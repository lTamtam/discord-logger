import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import { errorEmbed } from '../../utils/helpers';
import { createWebhook, deleteWebhook, editDbWebhook, editDiscordWebhook, getWebhook } from '../../utils/webhooks';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Basic setup command')
        .addSubcommand(subcommand =>
            subcommand.setName('set-webhook')
                .setDescription('Creates a webhook in a given channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setRequired(false)
                        .setDescription('Target @role')
                        .setDescriptionLocalizations({ fr: '@rôle' })
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('view-webhook')
                .setDescription('Shows information about the log webhook')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('delete-webhook')
                .setDescription('Removes a webhook from the server and the database')
        ),

    cooldown: 30,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        if (!ctx.inCachedGuild()) return;
        const subcommand = ctx.options.getSubcommand();

        if (subcommand === 'set-webhook') {
            const channel = ctx.options.getChannel('channel') ?? ctx.channel;
            if (!channel || channel.type !== ChannelType.GuildText) return errorEmbed(ctx, `${channel} is not a valid channel`, uuid);

            let webhook = await getWebhook(ctx.guild);

            if (webhook?.channelId === channel.id) {
                return errorEmbed(ctx, `This webhook already exists`, uuid);
            }
            else if (webhook && webhook.channelId !== channel.id) {
                const discord = await editDiscordWebhook(webhook, { channel: channel });
                if (!discord) return errorEmbed(ctx, `Discord error when editing the webhook`, uuid);
                const db = await editDbWebhook(webhook, channel);
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
            await ctx.reply({ embeds: [embed] });
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
                    \n\* *To remove that webhook, use \`/config delete-webhook\`*
                `)
                .setFooter({ text: `ID: ${uuid}` });
            await ctx.reply({ embeds: [embed] });
        }

        else if (subcommand === 'delete-webhook') {
            const webhook = await getWebhook(ctx.guild);
            if (!webhook) return errorEmbed(ctx, `There is no webhook on this server`, uuid);

            await deleteWebhook(ctx.guild);

            const embed = new EmbedBuilder()
                .setColor(0x2DFA60)
                .setDescription(`🗑️ Webhook \`${webhook.id}\` deleted`)
                .setFooter({ text: `ID: ${uuid}` });
            await ctx.reply({ embeds: [embed] });
        }
    }
};

export default command;