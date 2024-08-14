import { Events, Snowflake } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardReady';

const event: BotEvent = {
    name: Events.ShardReady,

    execute: async (shardId: number, unavailableGuilds: Set<Snowflake> | undefined) => {
        return logger.info({
            app: 'Bot',
            event: eventName,
            shardId: shardId,
            unavailableGuilds: unavailableGuilds
        }, `Shard ${shardId} is ready`);
    }
};

export default event;