import { AttachmentBuilder, Collection, EmbedAssetData, ImageURLOptions, MessageContextMenuCommandInteraction, SlashCommandBuilder, Snowflake, TextChannel } from 'discord.js'
import { SUUID } from 'short-uuid'

export interface BotSlashCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
    execute: (interaction: ChatInputCommandInteraction, uuid: SUUID) => void,
    autocomplete?: (interaction: AutocompleteInteraction) => void,
    cooldown?: number // s
}

export interface BotContextMenuCommand {
    data: ContextMenuCommandBuilder | UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
    execute: (interaction: ContextMenuCommandInteraction, uuid: SUUID) => void,
    cooldown?: number // s
}

export interface BotEvent {
    name: string,
    once?: boolean | false,
    execute: (...args) => void
}

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, BotSlashCommand>,
        cooldowns: Collection<string, number>,
        events: Collection<string, BotEvent>
    }
}

export interface Embed {
    author?: {
        name: string,
        iconURL: string | ImageURLOptions
    },
    title?: string
    description: string,
    fields: {
        name: string,
        value: string,
        inline?: boolean | false
    }[],
    footer?: {
        text: string
    },
    color: number,
    image?: {
        url: string
    },
    thumbnail?: EmbedAssetData,
    timestamp?: string
}

export interface WebhookEvent {
    id: string,
    guild: Guild,
    eventName?: string,
    eventBits?: number,
    embeds: Embed[],
    files?: AttachmentBuilder[]
}

export type StoredWebhook = {
    id: string,
    token: string,
    channelId: string
}

export type DbWebhookEditOptions = {
    channel?: TextChannel,
    events?: number
}

export type CacheMessageArray = [
    Snowflake,
    Snowflake,
    Snowflake,
    Snowflake,
    string,
    string[],
    string
]

export type CacheMessageObject = {
    id: Snowflake,
    guildId: Snowflake,
    channelId: Snowflake,
    authorId: Snowflake,
    content: string,
    attachmentsB64: string[],
    createdAt: Date
}

export type ActionsRawtype = {
    key: 'actions',
    old: {
        type: 1 | 2 | 3,
        metadata: {
            custom_message?: string,
            channel_id?: string,
            duration_seconds?: number
        }
    }[],
    new: {
        type: 1 | 2 | 3,
        metadata: {
            custom_message?: string,
            channel_id?: string,
            duration_seconds?: number
        }
    }[]
}

export type TriggerRawtype = {
    key: 'trigger_metadata',
    old: {
        mention_raid_protection_enabled?: boolean,
        mention_total_limit?: number
    },
    new: {
        mention_raid_protection_enabled?: boolean,
        mention_total_limit?: number
    }
}

export type KeywordRawType = {
    key: '$add_keyword_filter' | '$remove_keyword_filter',
    new: string[]
}

export type RegexRawType = {
    key: '$add_regex_patterns' | '$remove_regex_patterns',
    new: string[]
}

export type AllowRawType = {
    key: '$add_allow_list' | '$remove_allow_list',
    new: string[]
}

export enum EventsBits {
    AutoModerationRuleCreate = 2 ** 0,
    AutoModerationRuleDelete = 2 ** 1,
    AutoModerationRuleUpdate = 2 ** 2,
    ChannelCreate = 2 ** 3,
    ChannelDelete = 2 ** 4,
    ChannelUpdate = 2 ** 5,
    GuildBanAdd = 2 ** 6,
    GuildBanRemove = 2 ** 7,
    GuildEmojiCreate = 2 ** 8,
    GuildEmojiDelete = 2 ** 9,
    GuildEmojiUpdate = 2 ** 10,
    GuildMemberAdd = 2 ** 11,
    GuildMemberRemove = 2 ** 12,
    GuildMemberUpdate = 2 ** 13,
    GuildRoleCreate = 2 ** 14,
    GuildRoleDelete = 2 ** 15,
    GuildRoleUpdate = 2 ** 16,
    GuildStickerCreate = 2 ** 18,
    GuildStickerDelete = 2 ** 19,
    GuildStickerUpdate = 2 ** 20,
    GuildUpdate = 2 ** 21,
    InviteCreate = 2 ** 22,
    InviteDelete = 2 ** 23,
    MessageBulkDelete = 2 ** 24,
    MessageDelete = 2 ** 25,
    MessageUpdate = 2 ** 26,
    ThreadCreate = 2 ** 27,
    ThreadDelete = 2 ** 28,
    ThreadUpdate = 2 ** 29,
    VoiceStateUpdate = 2 ** 30,

    AutoModeration = AutoModerationRuleCreate + AutoModerationRuleDelete + AutoModerationRuleUpdate,
    Channel = ChannelCreate + ChannelDelete + ChannelUpdate,
    GuildBan = GuildBanAdd + GuildBanRemove,
    GuildEmoji = GuildEmojiCreate + GuildEmojiDelete + GuildEmojiUpdate,
    GuildMember = GuildMemberAdd + GuildMemberRemove + GuildMemberUpdate,
    GuildRole = GuildRoleCreate + GuildRoleDelete + GuildRoleUpdate,
    GuildSticker = GuildStickerCreate + GuildStickerDelete + GuildStickerUpdate,
    Guild = GuildUpdate,
    Invite = InviteCreate + InviteDelete,
    Message = MessageBulkDelete + MessageDelete + MessageUpdate,
    Thread = ThreadCreate + ThreadDelete + ThreadUpdate,
    Voice = VoiceStateUpdate,

    Default = AutoModeration + Channel + GuildBan + GuildEmoji + GuildMember + GuildRole + GuildSticker + Guild + Invite + Message + Thread + Voice
}