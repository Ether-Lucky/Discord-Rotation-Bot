const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// ─── Load Commands ────────────────────────────────────────────────────────────
const commandFolders = ['setup', 'rotation'];
const allCommands = [];

for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, 'commands', folder);
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      allCommands.push(command.data.toJSON());
    }
  }
}

// ─── Load Button / Select Menu Handlers ──────────────────────────────────────
const interactionHandlers = new Collection();
const buttonFolder = path.join(__dirname, 'buttons');
const buttonFiles = fs.readdirSync(buttonFolder).filter(f => f.endsWith('.js'));
for (const file of buttonFiles) {
  const handler = require(path.join(buttonFolder, file));
  interactionHandlers.set(handler.customId, handler);
}

// ─── Register Slash Commands ──────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: allCommands }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

// ─── Handle Interactions ──────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const [prefix] = interaction.customId.split(':');
      const handler = interactionHandlers.get(prefix);
      if (handler) await handler.execute(interaction);
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);
    const msg = { content: '❌ An error occurred.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);