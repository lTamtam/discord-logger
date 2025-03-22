import { Events, Guild } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'guildUnavailable';

const event: BotEvent = {
    name: Events.GuildUnavailable,

    execute: async (guild: Guild) => {
        return logger.warn({
            app: 'Bot',
            event: eventName,
            guild: guild.name,
            guildId: guild.id
        }, `${guild.name} is unavaiable`);
    }
};

export default event;