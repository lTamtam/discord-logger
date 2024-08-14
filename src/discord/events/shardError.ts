import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardError';

const event: BotEvent = {
    name: Events.ShardError,

    execute: async (error: Error, shardId: number) => {
        return logger.error({
            app: 'Bot',
            event: eventName,
            shardId: shardId,
            err: error
        }, `Shard ${shardId} error: ${error}`);
    }
};

export default event;