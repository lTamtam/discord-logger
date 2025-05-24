import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import logger from '../../utils/pino-logger';
import { errorEmbed } from '../../utils/util';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('timestamp')
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ])
        .setDescription('Returns the exact timestamp of a Discord ID')
        .addStringOption(option =>
            option.setName('id')
                .setRequired(true)
                .setDescription('Discord ID (Snowflake) to use')
        ),

    cooldown: 1,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const messageId = ctx.options.getString('id');
        if (!messageId || isNaN(parseInt(messageId)) || !Number.isInteger(+messageId)) return errorEmbed(ctx, 'Invalid snowflake');

        const date = new Date(Number(BigInt(messageId) >> 22n) + 1420070400000);
        const dateStr = `\`${date.toISOString().replace(/[TZ]/g, ' ')}GMT\``;

        const embed = new EmbedBuilder()
            .setColor(0x65FDFC)
            .setDescription(`[:snowflake:](https://discord.com/developers/docs/reference#snowflakes) Timestamp of **${messageId}**\n\n${dateStr}`)
            .setFooter({ text: `ID: ${uuid}` });

        try {
            await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        catch (err) {
            logger.error({
                app: 'Bot',
                command: command.data.name,
                uuid: uuid,
                err: err
            });
        }
    }
};

export default command;