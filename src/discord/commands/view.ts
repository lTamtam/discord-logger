import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { EMPTY_STRING, MAX_EMBED_FIELD_VALUE } from '../../config/constants';
import { BotSlashCommand } from '../../types';
import { getCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage } from '../../utils/messages/message-db';
import logger from '../../utils/pino-logger';
import { b64ToData, chunkify, errorEmbed } from '../../utils/util';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Displays a message stored in database')
        .addStringOption(option => option
            .setName('message-id')
            .setRequired(true)
            .setDescription('The message to display')
        ),

    cooldown: 5,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        const messageId = ctx.options.getString('message-id');
        if (!messageId) return await errorEmbed(ctx, 'Message not found', uuid);

        let db = await getDbMessage(messageId);
        if (!db) db = getCacheMessage(messageId);
        if (!db) return await errorEmbed(ctx, 'This message doesn\'t exist', uuid);
        if (db.guildId !== ctx.guildId) return await errorEmbed(ctx, 'This message is not available', uuid);

        await ctx.deferReply({ flags: MessageFlags.Ephemeral });
        const embed = new EmbedBuilder()
            .setColor(0x73F3A9)
            .setDescription(`[**Go to message**](https://discord.com/channels/${db.guildId}/${db.channelId}/${db.id})`)
            .setFooter({ text: `ID: ${uuid}` })
            .setTimestamp(db.createdAt);

        let chunks = [];
        if (db.content) {
            if (db.content.length > MAX_EMBED_FIELD_VALUE) {
                chunks = chunkify(db.content.replace(/\"/g, '"').replace(/`/g, ''));
            }
            else chunks.push(db.content);
        }
        else chunks.push(EMPTY_STRING);
        chunks.forEach((c: string, i) => {
            embed.addFields({
                name: `Content ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}`,
                value: c
            });
        });
        embed.addFields({ name: 'ID', value: `\`\`\`ini\nAuthor=${db.authorId}\nMessage=${db.id}\nChannel=${db.channelId}\nGuild=${db.guildId}\`\`\`` });

        let files: AttachmentBuilder[] = [];
        db.attachmentsB64.forEach(a => {
            const name = a.split(';data:')[0];
            const b64 = a.split(';base64,')[1];
            const file = b64ToData(b64);
            files.push(new AttachmentBuilder(file, { name: name }));
        });

        const reply = {
            files: files,
            embeds: [embed]
        };

        try {
            await ctx.editReply(reply);
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