import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import { deleteCacheUserMessages } from '../../utils/messages/message-cache';
import { deleteDbUserMessages } from '../../utils/messages/message-db';
import logger from '../../utils/pino-logger';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('clearmydata')
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ])
        .setDescription('Immediately deletes your messages from the database'),

    cooldown: 10,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const user = ctx.user;
        deleteCacheUserMessages(user.id);
        await deleteDbUserMessages(user.id);

        const embed = new EmbedBuilder()
            .setColor(0x2DFA60)
            .setDescription(`🎉 All your messages were deleted from the database`)
            .setFooter({ text: `ID: ${uuid}` });

        try {
            await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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