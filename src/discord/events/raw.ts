import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'raw';

const event: BotEvent = {
    name: Events.Raw,

    execute: async (x) => {
        const env = Bun.env.BUN_ENV!;

        if (env.toLowerCase() === 'dev') return logger.info({
            app: 'Bot',
            event: eventName
        }, `${JSON.stringify(x)}`);
    }
};

export default event;