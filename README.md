# Smart Warehouse

Warehouse app with:

- Product search by SKU / barcode
- Location-based quantities
- Critical stock status
- PostgreSQL via Prisma
- Camera scanner for barcode / QR
- Nginx reverse proxy in Docker
- Tabs for products, locations, and edit/add forms

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Docker Run

```bash
docker compose up -d --build
```

Open `http://localhost`.

## VPS Deploy

After cloning the repository on the VPS:

```bash
cd /root/smart-warehouse-1
sh scripts/deploy-vps.sh
```

Then open:

```text
http://YOUR_SERVER_IP
```

## SSL Note

Camera access on production requires `https` or `localhost`.
This repository now includes Nginx in Docker, but SSL still needs a real domain and certificate.
