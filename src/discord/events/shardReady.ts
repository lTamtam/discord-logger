import { Events, Snowflake } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardReady';

const event: BotEvent = {
    name: Events.ShardReady,

    execute: async (shardId: number, unavailableGuilds: Set<Snowflake> | undefined) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.info({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            shardId: shardId,
            unavailableGuilds: unavailableGuilds
        }, `Shard ${shardId} is ready`);
    }
};

export default event;