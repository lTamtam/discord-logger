export const CHANNEL = {                // CHANNELTYPE
    0: 'Text channel',                  // GuildText
    1: 'DM channel',                    // DM
    2: 'Voice channel',                 // GuildVoice
    3: 'Group DM channel',              // GroupDM
    4: 'Category channel',              // GuildCategory
    5: 'Announcment channel',           // GuildAnnouncement 
    10: 'Announcment thread',           // AnnouncementThread
    11: 'Public thread',                // PublicThread
    12: 'Private thread',               // PrivateThread
    13: 'Stage Voice channel',          // GuildStageVoice
    14: 'Directory channel',            // GuildDirectory
    15: 'Forum channel',                // GuildForum
    16: 'Media channel'                 // GuildMedia
};

export const AUTOMOD_TRIGGER = {
    1: 'Keyword',
    3: 'Spam',
    4: 'Keyword preset',
    5: 'Mention spam',
    6: 'Member Profile'
};

export const MESSAGE = {
    0: 'Default',
    1: 'Recipient Add',
    2: 'Recipient Remove',
    3: 'Call',
    4: 'Channel Name Change',
    5: 'Channel Icon Change',
    6: 'Channel PinnedMessage',
    7: 'User Join',
    8: 'Guild Boost',
    9: 'Guild Boost Tier1',
    10: 'Guild Boost Tier2',
    11: 'Guild Boost Tier3',
    12: 'Channel Follow Add',
    14: 'Guild Discovery Disqualified',
    15: 'Guild Discovery Requalified',
    16: 'Guild Discovery Grace Period Initial Warning',
    17: 'Guild Discovery Grace Period Final Warning',
    18: 'Thread Created',
    19: 'Reply',
    20: 'Chat Input Command',
    21: 'Thread Starter Message',
    22: 'Guild Invite Reminder',
    23: 'Context Menu Command',
    24: 'AutoModeration Action',
    25: 'Role Subscription Purchase',
    26: 'Interaction Premium Upsell',
    27: 'Stage Start',
    28: 'Stage End',
    29: 'Stage Speaker',
    /** @unstable https://github.com/discord/discord-api-docs/pull/5927#discussion_r1107678548*/
    30: 'Stage Raise Hand',
    31: 'Stage Topic',
    32: 'Guild Application Premium Subscription'
};

export const VERIFICATION_LEVELS_MAP = {
    0: 'Unrestricted',
    1: 'Low - Must have a verified email',
    2: 'Medium - Must be registered for 5 minutes',
    3: 'High - 10 minutes of membership required',
    4: 'Highest - Verified phone required'
};

export const EXPLICIT_CONTENT_LEVELS_MAP = {
    0: 'No Scanning Enabled',
    1: 'Scanning content from members without a role',
    2: 'Scanning content from all members'
};

export const MFA_LEVELS_MAP = {
    0: 'Disabled',
    1: 'Enabled'
};

export const NOTIFICATIONS_LEVEL_MAP = {
    0: 'All messages',
    1: 'Only @mentions'
};

export enum EVENTS_BITS {
    None = 0,
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
};