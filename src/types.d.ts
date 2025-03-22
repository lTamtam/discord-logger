import { AttachmentBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Collection, ContextMenuCommandBuilder, EmbedAssetData, ImageURLOptions, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, Snowflake, TextChannel, UserContextMenuCommandInteraction } from 'discord.js'
import { SUUID } from 'short-uuid'

export interface BotSlashCommand {
    data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder,
    execute: (interaction: ChatInputCommandInteraction, uuid: SUUID) => void,
    autocomplete?: (interaction: AutocompleteInteraction) => void,
    cooldown?: number // s
}

export interface BotUserContextMenuCommand {
    data: ContextMenuCommandBuilder,
    execute: (interaction: UserContextMenuCommandInteraction, uuid: SUUID) => void,
    cooldown?: number // s
}

export interface BotEvent {
    name: string,
    once?: boolean | false,
    execute: (...args) => void
}

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, BotSlashCommand | BotUserContextMenuCommand>,
        cooldowns: Collection<string, number>,
        events: Collection<string, BotEvent>
    }
}

export type Embed = {
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

export type WebhookEvent = {
    id: string,
    guild: Guild,
    name: string,
    bits: number,
    embeds: Embed[],
    files?: AttachmentBuilder[]
}

export type DbWebhook = {
    id: string,
    token: string,
    channelId: string,
    events: number
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

export type APIAutomodActions = {
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

export type APIAutomodTrigger = {
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

export type APIAutomodKeyword = {
    key: '$add_keyword_filter' | '$remove_keyword_filter',
    new: string[]
}

export type APIAutomodRegex = {
    key: '$add_regex_patterns' | '$remove_regex_patterns',
    new: string[]
}

export type APIAutomodAllow = {
    key: '$add_allow_list' | '$remove_allow_list',
    new: string[]
}