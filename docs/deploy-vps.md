# Deploy To VPS

This app is wired into `vps-docker` as:

- API process: `agulhada-mail`
- Worker process: `agulhada-mail-worker`
- Port: `3007`
- Host app path: `/home/vitor/apps/agulhada-mail`
- Container app path: `/app/agulhada-mail`

## On Local Machine

Push both repos:

```bash
cd C:\Users\Vitor\Documents\codebase\agulhada-mail
git push

cd C:\Users\Vitor\Documents\codebase\vps\vps-docker
git push
```

## On VPS

Clone or update the app:

```bash
mkdir -p /home/vitor/apps
cd /home/vitor/apps
git clone git@github.com:vitorleo/agulhada-mail.git agulhada-mail
cd agulhada-mail
npm ci
npm run build
cp .env.vps.example .env
nano .env
```

Use the Docker-network Mongo URL:

```env
MONGO_DATABASE_URL=mongodb://mulamanca:YOUR_PASSWORD@mongodb:27017/needles?authSource=needles
MONGO_DATABASE_NAME=needles
PORT=3007
```

Then create indexes:

```bash
npm run create-indexes
```

Update and rebuild the Docker stack:

```bash
cd /home/vitor/vps-docker
git pull
docker compose build webapps
docker compose up -d webapps
docker compose exec webapps pm2 status
docker compose exec webapps pm2 logs agulhada-mail --lines 100
```

Health check:

```bash
curl http://localhost:3007/health
```

After nginx points `https://email.agulhada.com` to `localhost:3007`, test:

```bash
curl https://email.agulhada.com/health
```

## SNS Subscription

Subscribe this HTTPS endpoint to the SNS topic:

```text
https://email.agulhada.com/webhooks/ses?secret=<SNS_WEBHOOK_SECRET>
```

The app confirms `SubscriptionConfirmation` messages automatically.
