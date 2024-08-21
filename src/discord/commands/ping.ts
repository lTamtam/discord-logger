import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('(pong)'),

    cooldown: 30,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const sent = await ctx.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x2DFA60)
            .setTitle(':ping_pong: Pong !')
            .setDescription(`:stopwatch: Uptime: **${Math.round(ctx.client.uptime / 60000)}** minutes\n:sparkling_heart: Websocket heartbeat: \`${ctx.client.ws.ping}\`ms\n:round_pushpin: Rountrip Latency: \`${sent.createdTimestamp - ctx.createdTimestamp}\`ms`)
            .setFooter({ text: `ID: ${uuid}` });
        await ctx.editReply({ content: null, embeds: [embed] });
    }
};

export default command;