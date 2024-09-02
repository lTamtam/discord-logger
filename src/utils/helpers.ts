import { Channel, ChannelType, EmbedBuilder, Guild, GuildMember, InteractionResponse, Message, RepliableInteraction, User } from 'discord.js';
import { existsSync, mkdirSync, readdirSync, unlink } from 'fs';
import path from 'path';
import logger from './pino-logger';

/**
 * Checks if a member has a specific roles
 * @param {GuildMember} member
 * @param {string[][]} roleLists
 * @returns {boolean}
*/
export function hasRole(member: GuildMember | null, ...roleLists: string[][]): boolean {
    if (!member || !roleLists.length || roleLists.every(i => i === null)) return false;
    for (let i = 1; i < roleLists.length; i++) {
        roleLists[0].push(...roleLists[i]);
    }
    const roles = roleLists[0];
    for (let j = 0; j < roles.length; j++) {
        if (member.roles.cache.has(roles[j])) return true;
    }
    return false;
};

/**
 * Checks if the bot has specific perms
 * @param {Guild} guild
 * @param {bigint[]} perms
 * @returns {boolean}
*/
export function hasPerms(guild: Guild, ...perms: bigint[]): boolean {
    for (const p of perms) {
        if (!guild.members.me?.permissions.has(p)) return false;
    }
    return true;
};

/**
 * Checks if the bot has specific channel perms
 * @param {Channel | null} channel
 * @param {bigint[]} perms
 * @returns {boolean}
*/
export function hasChannelPerms(channel: Channel, ...perms: bigint[]): boolean {
    if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM || channel.isThread()) return false;
    const member = channel.guild.members.me;
    if (!member) return false;
    for (const p of perms) {
        if (!channel.permissionsFor(member).has(p)) return false;
    }
    return true;
};

/**
 * Returns an user from an id / member
 * @param {Guild} guild
 * @param {GuildMember | string | undefined | null} userId
 * @returns {Promise<User | null>}
 */
export async function getUser(guild: Guild, userId: GuildMember | string | undefined | null): Promise<User | null> {
    if (!userId) return null;
    const user = userId instanceof GuildMember ? await guild.client.users.fetch(userId.id).catch(() => null) : await guild.client.users.fetch(userId).catch(() => null);
    return user;
};

/**
 * Returns a discord member from an id / user
 * @param {Guild} guild
 * @param {User | string | undefined | null} user
 * @returns {Promise<GuildMember | null>}
*/
export async function getMember(guild: Guild, user: User | string | undefined | null): Promise<GuildMember | null> {
    if (!user) return null;
    const member = user instanceof User ? await guild?.members.fetch(user.id).catch(() => null) : await guild?.members.fetch(user).catch(() => null);
    return member;
};

/**
 * Sends an embed message to display some error 
 * @param ctx 
 * @param text 
 * @param id 
 * @param ephemeral 
 * @returns 
 */
export async function errorEmbed(ctx: RepliableInteraction, text: string, id?: string | null, ephemeral?: boolean | true): Promise<void | InteractionResponse<boolean> | Message> {
    let options = {
        embeds: [new EmbedBuilder().setColor(0xFA514B).setDescription(`🚫 ${text}`)],
        ephemeral: typeof ephemeral === 'undefined' ? true : ephemeral
    };
    if (id) options.embeds[0].setFooter({ text: `ID: ${id}` });
    const loggerArgs = {
        app: 'Bot',
        action: 'send_embed',
        guildId: ctx.guild?.id,
        commandUserId: ctx.user.id,
        channelId: ctx.channel?.id
    };
    if (ctx.deferred) {
        return await ctx.editReply(options)
            .catch(err => {
                logger.error({ ...loggerArgs, err: err });
            });
    }
    return await ctx.reply(options)
        .catch(err => {
            logger.error({ ...loggerArgs, err: err });
        });
};

/**
 * Returns the different elements between 2 arrays
 * 
 * `getDifference(x, y)` will return the additions from x to y
 * 
 * `getDifference(y, x)` will return the deletions from x to y
 * @param {Array} x 
 * @param {Array} y 
 * @returns {Array}
 */
export function getDifference<T>(x: T[], y: T[]): T[] {
    return y.filter(i => !x.includes(i));
};

/**
 * Returns all duplicates from an array
 * @param {T[]} array
 * @returns {{T[]}}
*/
export function getDuplicates<T>(array: T[]): T[] {
    return array.filter((e, i) => array.indexOf(e) !== i);
};

/**
 * Returns an array without duplicates
 * @param {T[]} array
 * @returns {T}
*/
export function removeDuplicates<T>(array: T[]): T[] {
    return array.filter((e, i) => array.indexOf(e) === i);
};


/**
 * Converts a message to smaller chunks of text
 * @param {string} text 
 * @returns {string[]}
 */
export function chunkify(text: string): string[] {
    const chunksLength = Math.ceil(text.length / 1000);
    const chunks: string[] = [];
    for (let i = 0; i < chunksLength; i++) {
        const chunk = text.substring((1000 * i), i === 0 ? 1000 : 1000 * (i + 1));
        chunks.push(chunk);
    }
    return chunks;
};

/**
 * Returns a random hex color
 * @param {string} s 
 * @returns {string}
 */
export function randomColor(s?: string): string {
    return s + Math.floor(Math.random() * 16777216).toString(16);
};

/**
 * Deletes all files inside of a directory
 * @param dirName
 * @returns {void}
 */
export function deleteDirFiles(dirName: string): void {
    const tempDir = readdirSync(dirName);
    for (const file of tempDir) {
        unlink(path.join(dirName, file), err => {
            logger.error({
                action: 'delete_dir_files',
                dir: dirName,
                file: path.join(dirName, file),
                err: err
            });
        });
    }
};

/**
 * 
 * @returns {Promise<void>}
 */
export async function init(): Promise<void> {
    const env = {
        BUN_ENV: Bun.env.BUN_ENV,
        TOKEN: !!Bun.env.TOKEN,
        APP_ID: Bun.env.APP_ID,
        BOT_PERMISSIONS: Bun.env.BOT_PERMISSIONS,
        BOT_USERNAME: Bun.env.BOT_USERNAME,
        BOT_AVATAR: Bun.env.BOT_AVATAR,
        WEBHOOK_AVATAR: Bun.env.WEBHOOK_AVATAR,
        USER_DEFAULT_AVATAR: Bun.env.USER_DEFAULT_AVATAR,
        POSTGRES_USERNAME: Bun.env.POSTGRES_USERNAME,
        POSTGRES_PASSWORD: !!Bun.env.POSTGRES_PASSWORD,
        POSTGRES_HOST: Bun.env.POSTGRES_HOST,
        POSTGRES_PORT: Bun.env.POSTGRES_PORT,
        POSTGRES_DATABASE: Bun.env.POSTGRES_DATABASE,
        POSTGRES_CONNEXION_LIMIT: Bun.env.POSTGRES_CONNEXION_LIMIT,
        POSTGRES_URL: !!Bun.env.POSTGRES_URL,
        REDIS_PASSWORD: !!Bun.env.REDIS_PASSWORD,
        REDIS_HOST: Bun.env.REDIS_HOST,
        REDIS_PORT: Bun.env.REDIS_PORT,
        MASTERKEY: !!Bun.env.MASTERKEY
    };
    const entries = Object.entries(env).map(x => !!x[1]);
    let defined = true;
    for (let e = 0; e < entries.length; e++) {
        if (!entries[e]) {
            defined = false;
            logger.warn({ envVar: Object.entries(env)[e][0] }, `Env variable ${Object.entries(env)[e][0]} is undefined`);
        }
    }
    if (!defined) process.exit(1);

    const wd = import.meta.dir.split('src/')[0];
    if (!existsSync(path.join(wd, 'tmp'))) {
        mkdirSync(path.join(wd, 'tmp'));
        logger.info(`${path.join(wd, 'tmp')} directory was created`);
    }
};