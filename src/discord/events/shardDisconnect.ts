import { Events } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'shardDisconnect';

const event: BotEvent = {
    name: Events.ShardDisconnect,

    execute: async (closeEvent: CloseEvent, shardId: number) => {
        const suuid = short();
        const uuid = suuid.new();

        return logger.warn({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            shardId: shardId,
            closeEvent: closeEvent
        }, `Shard ${shardId} disconnected`);
    }
};

export default event;