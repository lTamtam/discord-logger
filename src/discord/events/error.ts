import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'error';

const event: BotEvent = {
    name: Events.Error,

    execute: async (error: Error) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.error({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            err: error
        });
    }
};

export default event;