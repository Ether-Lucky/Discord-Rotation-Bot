# 🔄 Discord Buddy Rotation Bot

A Discord bot that manages a buddy rotation system. Pairs or solo users take turns, and the current entry can mark themselves as "Done" to advance the rotation. Managers can also manually navigate or delete rotations at any time. Multiple rotations per server are supported.

---

## 📋 Features

- Admin setup with configurable manager role and display channel
- Multiple rotations per server — each command shows a picker when more than one exists
- Create, rename, and delete rotations
- Add buddy pairs or solo entries
- Remove entries via dropdown menu (auto-renumbers positions)
- Persistent live dashboard message that auto-updates on every change
- ✅ Done button — only the current pair/solo can press it
- Manual controls: next, previous, reset, pause, resume
- Completion logging via Supabase

---

## 🛠️ Prerequisites

- Node.js **v18+**
- A [Discord application & bot](https://discord.com/developers/applications)
- A [Supabase](https://supabase.com) project

---

## 🚀 Setup

### 1. Clone and install

```bash
git clone https://github.com/your-repo/discord-buddy-bot.git
cd discord-buddy-bot
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token from the Discord Developer Portal → Bot tab |
| `DISCORD_CLIENT_ID` | Your application's Client ID from General Information |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (not the anon key) |

### 3. Set up the Supabase database

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `schema.sql` and run it

### 4. Enable Privileged Gateway Intents

In the Discord Developer Portal → your app → **Bot** tab → scroll to **Privileged Gateway Intents**:
- ✅ Server Members Intent
- ✅ Message Content Intent

Click **Save Changes**.

### 5. Invite the bot to your server

Build the invite URL manually:

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=292057785344
```

Replace `YOUR_CLIENT_ID` with your Application ID, then open the link and select your server.

### 6. Start the bot

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Slash commands are registered automatically on startup.

---

## 📁 Project Structure

```
discord-buddy-bot/
├── src/
│   ├── index.js                      # Entry point
│   ├── commands/
│   │   ├── setup/
│   │   │   ├── setup.js              # /setup
│   │   │   └── view.js               # /setup-view
│   │   └── rotation/
│   │       ├── create.js             # /rotation-create
│   │       ├── rename.js             # /rotation-rename
│   │       ├── delete.js             # /rotation-delete
│   │       ├── addsolo.js            # /rotation-addsolo
│   │       ├── addpair.js            # /rotation-addpair
│   │       ├── removepair.js         # /rotation-removepair
│   │       ├── listpairs.js          # /rotation-listpairs
│   │       ├── publish.js            # /rotation-publish
│   │       ├── show.js               # /rotation-show
│   │       ├── next.js               # /rotation-next
│   │       ├── previous.js           # /rotation-previous
│   │       ├── reset.js              # /rotation-reset
│   │       ├── pause.js              # /rotation-pause
│   │       └── resume.js             # /rotation-resume
│   ├── buttons/
│   │   ├── doneButton.js             # ✅ Done button handler
│   │   ├── removePairSelect.js       # 🗑️ Remove pair dropdown handler
│   │   ├── rotationPickHandler.js    # 🔄 Rotation picker dropdown handler
│   │   ├── deleteRotation.js         # Confirm delete button handler
│   │   └── cancelDelete.js           # Cancel delete button handler
│   ├── services/
│   │   ├── settingsService.js        # Guild config CRUD
│   │   ├── rotationService.js        # Rotation & pair logic
│   │   └── messageService.js         # Embed building & message updates
│   ├── database/
│   │   └── supabase.js               # Supabase client
│   └── utils/
│       ├── permissions.js            # Manager role checks
│       ├── rotationPicker.js         # Shared rotation selection utility
│       └── formatPair.js             # Pair formatting helpers
├── schema.sql                        # Supabase table definitions
├── .env.example                      # Environment variable template
├── package.json
└── README.md
```

---

## 🎮 Commands

### Admin Commands
*(Require Administrator permission)*

| Command | Description |
|---|---|
| `/setup manager_role: display_channel:` | Configure the bot for this server |
| `/setup-view` | View current configuration |

### Rotation Manager Commands
*(Require the configured manager role or Administrator)*

| Command | Description |
|---|---|
| `/rotation-create name:` | Create a new rotation |
| `/rotation-rename name:` | Rename a rotation |
| `/rotation-delete` | Delete a rotation (with confirmation) |
| `/rotation-addpair user1: user2:` | Add a buddy pair |
| `/rotation-addsolo user:` | Add a single user with no partner |
| `/rotation-removepair` | Remove an entry via dropdown menu |
| `/rotation-listpairs` | List all entries (current marked 🎯) |
| `/rotation-publish` | Post the live dashboard message (blocked if already published) |
| `/rotation-unpublish` | Remove the dashboard message and allow republishing |
| `/rotation-show` | Display rotation status inline |
| `/rotation-next` | Manually advance to the next entry |
| `/rotation-previous` | Go back one entry |
| `/rotation-reset` | Reset to the first entry |
| `/rotation-pause` | Pause rotation (disables Done button) |
| `/rotation-resume` | Resume rotation (re-enables Done button) |

> **Multiple rotations:** When more than one rotation exists in the server, every command will show a dropdown asking which rotation to target before proceeding.

---

## 🔄 Typical Workflow

```
1. Admin runs /setup
      ↓
2. Manager runs /rotation-create name:"Weekly Buddies"
      ↓
3. Manager runs /rotation-addpair @Alice @Bob
   Manager runs /rotation-addpair @Charlie @David
   Manager runs /rotation-addsolo @Eve
      ↓
4. Manager runs /rotation-publish
      ↓
5. Dashboard message appears in the display channel
      ↓
6. Alice or Bob clicks ✅ Done
      ↓
7. Rotation advances to Charlie & David
   Dashboard updates automatically
   Charlie & David get mentioned
```

---

## 🗃️ Database Tables

| Table | Purpose |
|---|---|
| `guild_settings` | Stores manager role and display channel per server |
| `rotations` | Rotation records with name, current index, and message ID |
| `buddy_pairs` | Ordered list of entries per rotation (`user2_id` is NULL for solos) |
| `completion_logs` | History of who completed each turn and when |

---

## ⚠️ Edge Cases Handled

- **No entries** — Done button is disabled
- **Solo entry** — only that one user can press Done
- **One entry** — previous/next both point to the same entry
- **Deleted dashboard message** — bot recreates it automatically
- **Removed users** — still shown as `<@user_id>` mentions
- **Unauthorized Done click** — silently rejected with ephemeral error
- **Paused rotation** — Done button disabled until resumed
- **Remove pair** — remaining positions renumbered; current index adjusted automatically
- **Single rotation** — picker is skipped, command proceeds immediately
- **Multiple rotations** — dropdown appears to select which rotation to target

---

## 🔒 Security Notes

- Always use `SUPABASE_SERVICE_ROLE_KEY` server-side only — never expose it publicly
- The bot uses ephemeral replies for sensitive feedback so only the caller sees errors
- Manager commands are role-gated; only admins and the configured manager role can use them

---
