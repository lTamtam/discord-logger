import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardResume';

const event: BotEvent = {
    name: Events.ShardResume,

    execute: async (shardId: number, replayedEvents: number) => {
        return logger.info({
            app: 'Bot',
            event: eventName,
            shardId: shardId,
            replayedEvents: replayedEvents
        }, `Shard ${shardId} resumed with ${replayedEvents} events`);
    }
};

export default event;