import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Invite the bot to your server'),

    cooldown: 10,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const embed = new EmbedBuilder()
            .setColor(0x50EFFB)
            .setDescription(`📩 [**Invite link :)**](https://discord.com/oauth2/authorize?client_id=${Bun.env.APP_ID}&permissions=${Bun.env.BOT_PERMISSIONS}&integration_type=0&scope=bot+applications.commands)`)
            .setFooter({ text: `ID: ${uuid}` });
        await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};

export default command;