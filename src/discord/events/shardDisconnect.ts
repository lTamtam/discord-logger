import { Events } from 'discord.js';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardDisconnect';

const event: BotEvent = {
    name: Events.ShardDisconnect,

    execute: async (closeEvent: CloseEvent, shardId: number) => {
        return logger.warn({
            app: 'Bot',
            event: eventName,
            shardId: shardId,
            closeEvent: closeEvent
        }, `Shard ${shardId} disconnected`);
    }
};

export default event;