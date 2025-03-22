import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, PermissionFlagsBits, PermissionResolvable, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { SUUID } from 'short-uuid';
import { BotSlashCommand } from '../../types';
import logger from '../../utils/pino-logger';
import { errorEmbed, getMember } from '../../utils/util';

const command: BotSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ])
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Displays infos about a user')
        .addUserOption(option =>
            option.setName('user')
                .setRequired(false)
                .setDescription('Target @user')
        ),

    cooldown: 2,

    execute: async (ctx: ChatInputCommandInteraction, uuid: SUUID) => {
        if (!ctx.guild) return;

        const target = ctx.options.getUser('user') ?? ctx.user;
        const user = await ctx.client.users.fetch(target, { force: true }).catch(err => null);
        if (!user) return errorEmbed(ctx, 'User not found');
        const member = await getMember(ctx.guild, user);

        const embed = new EmbedBuilder()
            .setColor(user.accentColor ?? 0x2DFA60)
            .setAuthor({ name: `${user?.tag ?? 'Unknown user'} ${member && member.nickname ? `(${member.nickname})` : ''}`, iconURL: user?.avatarURL() ?? Bun.env.USER_DEFAULT_AVATAR! })
            .setThumbnail(user.avatarURL({ forceStatic: false, size: 4096 }) ?? Bun.env.USER_DEFAULT_AVATAR!)
            .addFields(
                { name: 'User', value: `${user} | **${user.tag}**` },
                { name: 'Avatar', value: user.avatarURL() ? `[**Link**](${user.avatarURL({ forceStatic: false, size: 4096 })})` : '`<None>`', inline: true },
                { name: 'Banner', value: user.bannerURL() ? `[**Link**](${user.bannerURL({ forceStatic: false, size: 4096 })})` : '`<None>`', inline: true },
                { name: 'Creation date', value: `<t:${Math.round(user.createdTimestamp! / 1000)}:F>` },
            )
            .setFooter({ text: `ID: ${uuid}` });
        if (ctx.guild && member) {
            const maxRoles = 45;
            const roles = member.roles.cache.filter(r => r.id !== ctx.guild?.id);
            const rolesList = roles.sort((a, b) => b.position - a.position).map(r => `${r}`).slice(0, maxRoles);
            if (rolesList.length === maxRoles) rolesList.push(`**...+${roles.size - maxRoles}**`);
            if (member.joinedTimestamp) embed.addFields({ name: 'Joined at', value: `<t:${Math.round(member.joinedTimestamp / 1000)}:F>` });
            embed.addFields(
                { name: `Nitro boost`, value: member.premiumSinceTimestamp ? `**Yes**, since <t:${Math.round(member?.premiumSinceTimestamp / 1000)}:F>` : '**No**' },
                { name: `Roles [${roles.size}]`, value: roles.size ? rolesList.join(' ') : '`<None>`' },
                { name: 'Permissions', value: `${(Object.keys(PermissionsBitField.Flags)).filter(p => new PermissionsBitField(member.permissions.bitfield).has(p as PermissionResolvable)).map(s => `✅ ${s}`).join('\n')}` }
                //{ name: 'Permissions', value: `\`\`\`${member.permissions.toArray().join(', ')}\`\`\`` }
            );
        }
        embed.addFields({ name: 'ID', value: `\`\`\`ini\n${user.bot ? 'Bot' : 'User'}=${user.id ?? '???'}${member ? `\nPermissions=${member.permissions.bitfield}` : ''}\`\`\`` });

        try {
            await ctx.reply({ embeds: [embed] });
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