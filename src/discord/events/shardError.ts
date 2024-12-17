import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardError';

const event: BotEvent = {
    name: Events.ShardError,

    execute: async (error: Error, shardId: number) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.error({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            shardId: shardId,
            err: error
        }, `Shard ${shardId} error: ${error}`);
    }
};

export default event;