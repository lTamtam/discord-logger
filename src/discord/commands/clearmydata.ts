import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import { deleteCacheUserMessages } from '../../utils/messages/message-cache';
import { deleteDbUserMessages } from '../../utils/messages/message-db';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('clearmydata')
        .setDMPermission(false)
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
        await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};

export default command;