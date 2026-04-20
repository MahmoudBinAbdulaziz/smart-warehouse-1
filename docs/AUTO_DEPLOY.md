# Automatic deployment (push → live)

Once configured, every push to `main` automatically:

1. Runs TypeScript type-check in GitHub Actions.
2. SSHs into your VPS, pulls the latest code, rebuilds Docker, runs Prisma migrations, and seeds the admin user.

## One-time setup

### 1. On the VPS (first deploy only)

```bash
# Clone the repo somewhere, e.g. /opt/smartwarehouse
sudo git clone https://github.com/MahmoudBinAbdulaziz/smart-warehouse-1.git /opt/smartwarehouse
cd /opt/smartwarehouse
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

On first run the script will:

- Create `.env` automatically from `.env.example`.
- Generate a strong `AUTH_SECRET` (64+ chars).
- Generate a random admin password and print it to the console. **Save it.**
- Build containers, run migrations, and seed the first admin user.

After this, `.env` lives only on the VPS and is never committed to git.

### 2. Add GitHub repository secrets

In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret             | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| `VPS_HOST`         | IP or domain of the VPS, e.g. `185.23.45.67` or `warehouse.example.com` |
| `VPS_USER`         | SSH user, e.g. `root` or `ubuntu`                                     |
| `VPS_PORT`         | SSH port (optional, default 22)                                       |
| `VPS_SSH_KEY`      | The **private** SSH key contents (the full `id_ed25519` file)          |
| `VPS_PROJECT_PATH` | Absolute path on the VPS, e.g. `/opt/smartwarehouse`                  |

Generate an SSH key for the pipeline on your machine:

```bash
ssh-keygen -t ed25519 -f vps_deploy_key -C "gh-actions"
# copy the public key to the VPS
ssh-copy-id -i vps_deploy_key.pub root@YOUR_VPS_IP
# copy the content of vps_deploy_key (private) into the VPS_SSH_KEY secret
cat vps_deploy_key
```

### 3. Done

From now on, every `git push origin main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml` which runs the type-check and then executes `scripts/deploy-vps.sh` on your VPS.

## Manual deploy

You can also trigger it manually:

- From the GitHub UI: **Actions → Deploy to VPS → Run workflow**.
- From the VPS: `cd /opt/smartwarehouse && git pull && ./scripts/deploy-vps.sh`.

## Rotating secrets

To rotate `AUTH_SECRET` on the VPS:

```bash
cd /opt/smartwarehouse
sed -i '/^AUTH_SECRET=/d' .env
./scripts/deploy-vps.sh   # the script regenerates AUTH_SECRET if missing
```

To change the admin password, log in as admin and use the UI, or delete the admin row and re-run the seed.
