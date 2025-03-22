import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'warn';

const event: BotEvent = {
    name: Events.Warn,

    execute: async (message: string) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.warn({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            msg: message
        });
    }
};

export default event;