import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'error';

const event: BotEvent = {
    name: Events.Error,

    execute: async (error: Error) => {
        return logger.error({
            app: 'Bot',
            event: eventName,
            err: error
        }, error.message);
    }
};

export default event;