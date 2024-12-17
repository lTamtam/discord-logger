import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { readdirSync } from 'fs';
import logger from './pino-logger';

const TOKEN = Bun.env.TOKEN!;
const CLIENT_ID = Bun.env.APP_ID!;
if (!TOKEN || !CLIENT_ID) process.exit(1);

const commands = [];
const commandFiles = readdirSync('./src/discord/commands').filter(file => file.endsWith('.ts'));

for (const file of commandFiles) {
    const command = require(`../discord/commands/${file}`).default;
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const data: any = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        logger.info({
            app: 'Bot',
            action: 'deploy_commands'
        }, `Reloaded ${data.length} application commands`);
        process.exit(0);
    }
    catch (err) {
        logger.error({
            app: 'Bot',
            action: 'deploy_commands',
            err: err
        }, 'Failed to reload application commands');
        process.exit(1);
    }
})();