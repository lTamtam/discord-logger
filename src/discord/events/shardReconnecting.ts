import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardReconnecting';

const event: BotEvent = {
    name: Events.ShardReconnecting,

    execute: async (shardId: number) => {
        return logger.info({
            app: 'Bot',
            event: eventName,
            shardId: shardId
        }, `Shard ${shardId} is reconnecting`);
    }
};

export default event;