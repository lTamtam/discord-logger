import { AttachmentBuilder, Collection, EmbedAssetData, ImageURLOptions, SlashCommandBuilder, Snowflake } from 'discord.js'
import { SUUID } from 'short-uuid'

export interface BotSlashCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
    execute: (interaction: ChatInputCommandInteraction, uuid: SUUID) => void,
    autocomplete?: (interaction: AutocompleteInteraction) => void,
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
    files?: AttachmentBuilder[],
    thumbnail?: EmbedAssetData
}

export interface WebhookEvent {
    id: string,
    guild: Guild,
    eventName?: string,
    timestamp: Date,
    embeds: Embed[]
}

export type StoredWebhook = {
    id: string,
    token: string,
    channelId: string
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