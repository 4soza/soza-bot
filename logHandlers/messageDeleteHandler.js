const LogConfig = require('../models/serverLogs/LogConfig');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');

module.exports = function messageDeleteHandler(client) {
    client.on('messageDelete', async message => {
        if (!message.guildId && !message.guild) return;

        if (!message.guild || message.partial) return;

        const config = await LogConfig.findOne({
            guildId: message.guild.id,
            eventType: 'messageDelete'
        });
        if (!config?.channelId) return;

        const logChannel = client.channels.cache.get(config.channelId);
        if (!logChannel) return;

        const truncateContent = (content, maxLength = 1000) => {
            if (!content) return '*No content available*';
            return content.length > maxLength
                ? `${content.substring(0, maxLength)}...`
                : content;
        };

        const attachmentInfo = message.attachments.size > 0
            ? `\n\n**Attachments**\n${message.attachments.map(att => `• ${att.name} (${att.size} bytes)`).join('\n')}`
            : '';

        const logContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# 🗑️ Message Deleted\n## Content Removal Detected\n\n> Message permanently removed\n> Deletion event logged for moderation')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**Author**\n${message.author?.tag || 'Unknown User'}\n\n**Author ID**\n\`${message.author?.id || 'Unknown'}\`\n\n**Channel**\n<#${message.channel.id}>\n\n**Message ID**\n\`${message.id}\`\n\n**Originally Sent**\n<t:${Math.floor(message.createdTimestamp / 1000)}:F>\n\n**Deleted At**\n<t:${Math.floor(Date.now() / 1000)}:F>`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`## 📄 **Deleted Content**\n\n**Message Content**\n\`\`\`\n${truncateContent(message.content)}\n\`\`\`\n\n**Content Info**\nCharacter count: ${message.content?.length || 0}\nAttachments: ${message.attachments.size}${attachmentInfo}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`*Logs System • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        logChannel.send({
            components: [logContainer],
            flags: MessageFlags.IsComponentsV2
        });
    });
};
