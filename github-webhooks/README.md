# github-webhooks

Trigger shell commands using GitHub webhooks.

## Requirements

- Node.js
- pnpm
- pm2

## Usage

### Add github-webhooks to your project

Copy (don't clone) this repository to `/github-webhooks` at the root of your project, then edit `webhooks.js` to customize the shell commands.

Commit the new files to your project's codebase.

### Set up the server

Ensure pm2 is installed and set up:

```bash
# Install pm2 globally
pnpm add -g pm2

# Install pm2 startup script
pnpm startup
```

Copy `.env.exapmle` to `.env` and set up environment variables. Generate a long random string for `GITHUB_WEBHOOKS_SECRET`.

Install dependnecies:

```bash
pnpm install
```

Start the server using pm2:

```bash
pm2 start webhooks.js --watch
```

Save the pm2 app list to be restored at reboot:

```bash
pm2 save
```

### Add the webhook on GitHub

Navigate to Settings > Webhooks on your GitHub repository and add a webhook with the following settings:

| Field | Value |
| --- | --- |
| Payload URL | https://your.domain:3000/api/github/webhooks |
| Content type | application/json |
| Secret | The value of `GITHUB_WEBHOOKS_SECRET` in the `.env` file |
| Which events would you like to trigger this webhook? | Just the `push` event |
| Active | checked |
