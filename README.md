# Script Drop

A small Next.js site where scripts can be uploaded two ways:

- **On the website** — a form that stores the file in Vercel Blob.
- **From Discord** — a `/upload` slash command that does the same thing.

Both paths write to the same storage, so anything uploaded from Discord shows up
on the site immediately, and vice versa.

No always-on bot process is needed. Discord slash commands can be delivered as
plain HTTP requests to a URL you specify ("Interactions Endpoint URL"), which is
exactly what a Vercel serverless function is good at — so the whole thing runs
on Vercel with nothing else to host.

## 1. Set up Vercel Blob

1. In your Vercel project, go to **Storage → Create Database → Blob**.
2. This automatically adds a `BLOB_READ_WRITE_TOKEN` environment variable to your project.

## 2. Set up the Discord application

1. Go to https://discord.com/developers/applications and create a new application.
2. Under **General Information**, copy the **Public Key** → this is `DISCORD_PUBLIC_KEY`.
3. Also copy the **Application ID** → this is `DISCORD_APPLICATION_ID`.
4. Under **Bot**, create a bot and copy its token → this is `DISCORD_BOT_TOKEN`.
   (Keep this secret — never commit it.)

## 3. Deploy to Vercel

1. Push this project to a GitHub repo, then import it in Vercel
   (or run `vercel` from this folder).
2. In the Vercel project settings, add these environment variables:
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_APPLICATION_ID`
   - `BLOB_READ_WRITE_TOKEN` (already added by step 1)
3. Deploy. Note your deployment URL, e.g. `https://your-app.vercel.app`.

## 4. Point Discord at your deployment

1. Back in the Discord Developer Portal, under **General Information**, set
   **Interactions Endpoint URL** to:
   ```
   https://your-app.vercel.app/api/discord/interactions
   ```
   Discord will send a test ping immediately — the deployment must already be
   live with the correct `DISCORD_PUBLIC_KEY` set, or verification will fail.

## 5. Register the slash commands

Locally, copy `.env.example` to `.env`, fill in the three Discord values, then run:

```bash
npm install
npm run register-commands
```

This registers `/upload` and `/scripts` globally (can take up to an hour to
appear everywhere the first time, though it's usually fast).

## 6. Invite the bot to your server

Build an invite URL with the `applications.commands` scope and open it:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=applications.commands
```

(You don't need the `bot` scope unless you want it to also do other things —
slash commands only need `applications.commands`.)

## Using it

- **Website**: open the deployed URL, pick a file, upload.
- **Discord**: run `/upload file:<attach your script>` in any channel the bot
  can see. Run `/scripts` to list the 10 most recent uploads.

## Local development

```bash
npm install
npm run dev
```

Note: the Discord interactions route needs a public HTTPS URL to receive
requests from Discord, so testing that part locally requires a tunnel (e.g.
`ngrok http 3000`) pointed at `/api/discord/interactions`. The upload form and
script list work fine at `localhost:3000` on their own.
