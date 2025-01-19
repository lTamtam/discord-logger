import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import init from './config/init';
import { BotEvent, BotSlashCommand, BotUserContextMenuCommand } from './types';

init();

const TOKEN = Bun.env.TOKEN!;
const dir = import.meta.dir;

export const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.AutoModerationConfiguration
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.ThreadMember
    ]
});

discordClient.commands = new Collection();
discordClient.cooldowns = new Collection();
discordClient.events = new Collection();

const commandsPath = path.join(dir, 'discord/commands');
const commandsFiles = readdirSync(commandsPath).filter(f => f.endsWith('.ts'));

const eventsPath = path.join(dir, 'discord/events');
const eventsFiles = readdirSync(eventsPath).filter(f => f.endsWith('.ts'));

for (const file of commandsFiles) {
    const filePath = path.join(commandsPath, file);
    const command: BotSlashCommand | BotUserContextMenuCommand = require(filePath).default;
    discordClient.commands.set(command.data.name, command);
}

for (const file of eventsFiles) {
    const filePath = path.join(eventsPath, file);
    const event: BotEvent = require(filePath).default;
    discordClient.events.set(event.name, event);
    if (event.once) {
        discordClient.once(event.name, (...args: any[]) => event.execute(...args));
    }
    else {
        discordClient.on(event.name, (...args: any[]) => event.execute(...args));
    }
}

discordClient.login(TOKEN);