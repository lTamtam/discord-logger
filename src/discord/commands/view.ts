import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import { MAX_EMBED_FIELD_VALUE } from '../../utils/constants';
import { chunkify, errorEmbed } from '../../utils/helpers';
import { getCacheMessage } from '../../utils/messages/message-cache';
import { getDbMessage } from '../../utils/messages/message-db';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDMPermission(false)
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

        const iT = new Date().getTime();
        let db = await getDbMessage(messageId);
        if (!db) db = getCacheMessage(messageId);
        if (!db) return await errorEmbed(ctx, 'This message doesn\'t exist', uuid);
        if (db.guildId !== ctx.guildId) return await errorEmbed(ctx, 'This message is not available', uuid);

        await ctx.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
            .setColor(0x73F3A9)
            .setDescription(`[**Go to message**](https://discord.com/channels/${db.guildId}/${db.channelId}/${db.id})`)
            .setFooter({ text: `ID: ${uuid} • ${new Date().getTime() - iT}ms` })
            .setTimestamp(db.createdAt);

        let chunks = [];
        if (db.content) {
            if (db.content.length > MAX_EMBED_FIELD_VALUE) {
                chunks = chunkify(db.content.replace(/\"/g, '"').replace(/`/g, ''));
            }
            else chunks.push(db.content);
        }
        else chunks.push('`<None>`');
        chunks.forEach((c: string, i) => {
            embed.addFields({
                name: `Content ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}`,
                value: c
            })
        });
        embed.addFields({ name: 'ID', value: `\`\`\`ini\nGuild=${db.guildId}\nChannel=${db.channelId}\nAuthor=${db.authorId}\`\`\`` })

        let files: AttachmentBuilder[] = [];
        db.attachmentsB64.forEach(a => {
            const name = a.split(';data:')[0];
            const b64 = a.split(';base64,')[1];
            const file = Buffer.from(b64, 'base64');
            files.push(new AttachmentBuilder(file, { name: name }));
        });

        const reply = {
            files: files,
            embeds: [embed]
        };
        await ctx.editReply(reply);
    }
};

export default command;