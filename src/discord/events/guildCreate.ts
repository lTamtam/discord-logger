import { Events, Guild } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'guildCreate';

const event: BotEvent = {
    name: Events.GuildCreate,

    execute: async (guild: Guild) => {
        const suuid = short();
        const uuid = suuid.new();

        logger.info({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            guild: guild.name,
            guildId: guild.id
        }, `${guild.name} was created or the bot was added to that server`);
    }
};

export default event;