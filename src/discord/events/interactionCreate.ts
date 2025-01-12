import { Events, Interaction } from 'discord.js';
import short from 'short-uuid';
import { BotEvent, BotSlashCommand, BotUserContextMenuCommand } from '../../types';
import logger from '../../utils/pino-logger';
import { errorEmbed } from '../../utils/util';

const eventName = 'interactionCreate';

const event: BotEvent = {
    name: Events.InteractionCreate,

    execute: async (interaction: Interaction) => {
        if (!interaction.inCachedGuild()) return;
        const suuid = short();
        const uuid = suuid.new();

        if (interaction.isChatInputCommand()) {
            let command = interaction.client.commands.get(interaction.commandName) as BotSlashCommand;
            let cooldown = interaction.client.cooldowns.get(`${interaction.commandName}-${interaction.user.username}`);
            if (!command) return;

            if (command.cooldown && cooldown) {
                if (Date.now() < cooldown) {
                    const waiting = Math.floor(Math.abs(Date.now() - cooldown) / 1000);
                    errorEmbed(interaction, `You have to wait ${waiting} second${waiting > 1 ? 's' : ''} to use this command again`);
                    setTimeout(() => interaction.deleteReply(), 5000);
                    return;
                }
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
                setTimeout(() => {
                    interaction.client.cooldowns.delete(`${interaction.commandName}-${interaction.user.username}`)
                }, command.cooldown * 1000);
            } else if (command.cooldown && !cooldown) {
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
            }

            try {
                command.execute(interaction, uuid);
            } catch (err) {
                logger.error({
                    app: 'Bot',
                    event: eventName,
                    action: 'execute_slash_command',
                    command: command,
                    uuid: uuid,
                    err: err
                }, `Error while executing ${command} command`);
            }
            return;
        }

        else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName) as BotSlashCommand;

            if (!command) {
                logger.error({
                    app: 'Bot',
                    action: 'autocomplete',
                    event: eventName,
                    command: interaction.commandName,
                    uuid: uuid
                }, `No command matching ${interaction.commandName} was found`);
                return;
            }

            try {
                if (!command.autocomplete) return;
                command.autocomplete(interaction);
            } catch (err) {
                logger.error({
                    app: 'Bot',
                    action: 'autocomplete',
                    event: eventName,
                    command: command,
                    uuid: uuid,
                    err: err
                }, `Error while autocompleting ${command} command`);
            }
            return;
        }

        else if (interaction.isUserContextMenuCommand()) {
            let command = interaction.client.commands.get(interaction.commandName) as BotUserContextMenuCommand;
            let cooldown = interaction.client.cooldowns.get(`${interaction.commandName}-${interaction.user.username}`);
            if (!command) return;

            if (command.cooldown && cooldown) {
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
                setTimeout(() => {
                    interaction.client.cooldowns.delete(`${interaction.commandName}-${interaction.user.username}`)
                }, command.cooldown * 1000);
            } else if (command.cooldown && !cooldown) {
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
            }

            try {
                command.execute(interaction, uuid);
            } catch (err) {
                logger.error({
                    app: 'Bot',
                    event: eventName,
                    action: 'execute_context_menu_command',
                    command: command,
                    uuid: uuid,
                    err: err
                }, `Error while executing ${command} command`);
            }
            return;
        }
    }
}

export default event;