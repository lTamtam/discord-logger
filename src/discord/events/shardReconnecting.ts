import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardReconnecting';

const event: BotEvent = {
    name: Events.ShardReconnecting,

    execute: async (shardId: number) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.info({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            shardId: shardId
        }, `Shard ${shardId} is reconnecting`);
    }
};

export default event;