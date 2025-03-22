import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardResume';

const event: BotEvent = {
    name: Events.ShardResume,

    execute: async (shardId: number, replayedEvents: number) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.info({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            shardId: shardId,
            replayedEvents: replayedEvents
        }, `Shard ${shardId} resumed with ${replayedEvents} events`);
    }
};

export default event;