import axios from 'axios';
import { Channel, ChannelType, EmbedBuilder, Guild, GuildMember, InteractionResponse, Message, RepliableInteraction, ThreadMember, User, UserResolvable } from 'discord.js';
import logger from './pino-logger';

/**
 * Returns an user from a user resolvable
 * @param {Guild} guild
 * @param {UserResolvable | null} u
 * @returns {Promise<User | null>}
 */
export async function getUser(guild: Guild, u: UserResolvable | null): Promise<User | null> {
    if (u instanceof User) return Promise.resolve(u);
    if (u instanceof GuildMember || u instanceof ThreadMember) return Promise.resolve(u.user);
    if (u instanceof Message) return Promise.resolve(u.author);
    if (typeof u === "string") return await guild.client.users.fetch(u).catch(err => null);
    return null;
};

/**
 * Returns a member from an member resolvable
 * @param {Guild} guild
 * @param {UserResolvable | null} u
 * @returns {Promise<GuildMember | null>}
*/
export async function getMember(guild: Guild, u: UserResolvable | null): Promise<GuildMember | null> {
    if (u instanceof GuildMember) return Promise.resolve(u);
    if (u instanceof User || u instanceof ThreadMember) return await guild.members.fetch(u.id).catch(err => null);
    if (u instanceof Message) return await guild.members.fetch(u.author.id).catch(err => null);
    if (typeof u === "string") return await guild.members.fetch(u).catch(err => null);
    return null;
};

/**
 * Checks if a member has a specific roles
 * @param {GuildMember} member
 * @param {string[][]} roleLists
 * @returns {boolean}
*/
export function memberHasRole(member: GuildMember, ...roleLists: string[][]): boolean {
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
 * Checks if a member has specific perms
 * @param {GuildMember} member
 * @param {bigint[]} perms
 * @returns {boolean}
*/
export function memberHasPerms(member: GuildMember, ...perms: bigint[]): boolean {
    if (!member) return false;
    for (const p of perms) {
        if (member.permissions.has(p)) return true;
    }
    return false;
};

/**
 * Checks if a member has specific channel perms
 * @param {Channel} channel
 * @param {bigint[]} perms
 * @returns {boolean}
*/
export function memberHasChannelPerms(member: GuildMember, channel: Channel, ...perms: bigint[]): boolean {
    if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM || channel.isThread()) return false;
    if (!member) return false;
    for (const p of perms) {
        if (channel.permissionsFor(member).has(p)) return true;
    }
    return false;
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
export function getUniques<T>(array: T[]): T[] {
    return array.filter((e, i) => array.indexOf(e) === i);
};

/**
 * Converts given url data into base64
 * @param {string} url
 * @returns {string}
 */
export async function dataToB64(url: string): Promise<string | null> {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    if (!res) return null;
    return res.data.toString('base64');
};

/**
 * Converts a base64 string into data
 * @param {string} b64
 * @returns {Buffer}
 */
export function b64ToData(b64: string): Buffer {
    return Buffer.from(b64, 'base64');
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