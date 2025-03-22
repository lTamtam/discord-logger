import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import logger from '../../utils/pino-logger';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ])
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('(pong)'),

    cooldown: 10,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const sent = await ctx.deferReply({ flags: MessageFlags.Ephemeral });

        const embed = new EmbedBuilder()
            .setColor(0x2DFA60)
            .setTitle(':ping_pong: Pong !')
            .setDescription(`:stopwatch: Uptime: **${Math.round(ctx.client.uptime / 60000)}** minutes\n:sparkling_heart: Websocket heartbeat: \`${ctx.client.ws.ping}\`ms\n:round_pushpin: Rountrip Latency: \`${sent.createdTimestamp - ctx.createdTimestamp}\`ms`)
            .setFooter({ text: `ID: ${uuid}` });

        try {
            await ctx.editReply({ content: null, embeds: [embed] });
        }
        catch (err) {
            logger.error({
                app: 'Bot',
                command: command.data.name,
                err: err
            });
        }
    }
};

export default command;