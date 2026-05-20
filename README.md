# 🔄 Discord Buddy Rotation Bot

A Discord bot that manages a buddy rotation system. Pairs of users take turns, and the current pair can mark themselves as "Done" to advance the rotation.

---

## 📋 Features

- Admin setup with configurable manager role and display channel
- Create named rotations and add buddy pairs
- Persistent live dashboard message that auto-updates
- ✅ Done button — only the current pair can press it
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
| `DISCORD_TOKEN` | Your bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Your application's Client ID |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (not the anon key) |

### 3. Set up the Supabase database

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `schema.sql` and run it

### 4. Invite the bot to your server

In the Discord Developer Portal:
1. Go to **OAuth2 → URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Send Messages`, `Read Messages/View Channels`, `Embed Links`, `Manage Messages`
4. Open the generated URL and invite the bot

### 5. Start the bot

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
│   ├── index.js                    # Entry point
│   ├── commands/
│   │   ├── setup/
│   │   │   ├── setup.js            # /setup
│   │   │   └── view.js             # /setup-view
│   │   └── rotation/
│   │       ├── create.js           # /rotation-create
│   │       ├── addpair.js          # /rotation-addpair
│   │       ├── removepair.js       # /rotation-removepair
│   │       ├── listpairs.js        # /rotation-listpairs
│   │       ├── publish.js          # /rotation-publish
│   │       ├── show.js             # /rotation-show
│   │       ├── next.js             # /rotation-next
│   │       ├── previous.js         # /rotation-previous
│   │       ├── reset.js            # /rotation-reset
│   │       ├── pause.js            # /rotation-pause
│   │       └── resume.js           # /rotation-resume
│   ├── buttons/
│   │   └── doneButton.js           # ✅ Done button handler
│   ├── services/
│   │   ├── settingsService.js      # Guild config CRUD
│   │   ├── rotationService.js      # Rotation & pair logic
│   │   └── messageService.js      # Embed building & message updates
│   ├── database/
│   │   └── supabase.js             # Supabase client
│   └── utils/
│       ├── permissions.js          # Manager role checks
│       └── formatPair.js           # Pair formatting helpers
├── schema.sql                      # Supabase table definitions
├── .env.example                    # Environment variable template
├── package.json
└── README.md
```

---

## 🎮 Commands

### Admin Commands
*(Require Administrator permission)*

| Command | Description |
|---|---|
| `/setup manager_role: display_channel:` | Configure the bot |
| `/setup-view` | View current configuration |

### Rotation Manager Commands
*(Require the configured manager role or Administrator)*

| Command | Description |
|---|---|
| `/rotation-create name:` | Create a new rotation |
| `/rotation-addpair user1: user2:` | Add a buddy pair |
| `/rotation-removepair position:` | Remove a pair by position number |
| `/rotation-listpairs` | List all pairs (current pair marked 🎯) |
| `/rotation-publish` | Post the live dashboard message |
| `/rotation-show` | Display rotation status inline |
| `/rotation-next` | Manually advance to next pair |
| `/rotation-previous` | Go back one pair |
| `/rotation-reset` | Reset to the first pair |
| `/rotation-pause` | Pause rotation (disables Done button) |
| `/rotation-resume` | Resume rotation (re-enables Done button) |

---

## 🔄 Typical Workflow

```
1. Admin runs /setup
      ↓
2. Manager runs /rotation-create name:"Weekly Buddies"
      ↓
3. Manager runs /rotation-addpair @Alice @Bob
   Manager runs /rotation-addpair @Charlie @David
   Manager runs /rotation-addpair @Eve @Frank
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
| `rotations` | Rotation records with current index and message ID |
| `buddy_pairs` | Ordered list of user pairs per rotation |
| `completion_logs` | History of who completed each turn |

---

## ⚠️ Edge Cases Handled

- **No pairs** — Done button is disabled
- **One or two pairs** — previous/next wrap correctly
- **Deleted status message** — bot recreates it automatically
- **Removed users** — still shown as `<@user_id>` mentions
- **Unauthorized Done click** — silently rejected with ephemeral error
- **Paused rotation** — Done button is disabled until resumed

---

## 🔒 Security Notes

- Always use `SUPABASE_SERVICE_ROLE_KEY` server-side only — never expose it publicly
- The bot uses ephemeral replies for sensitive feedback so only the caller sees errors
- Row-level security (RLS) can be enabled in Supabase for additional protection

---

## 📄 License

MIT