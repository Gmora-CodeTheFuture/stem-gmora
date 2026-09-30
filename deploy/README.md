# Deploying Gmora STEM (Docker + Kubernetes)

Enterprise deployment uses one multi-role container image, Redis for session/cache/queue, Postgres for data, and S3-compatible object storage for PDFs, presentations, certificates, and uploads.

## Architecture

| Workload | Command | Notes |
|---|---|---|
| `web` | nginx + php-fpm | Horizontally scaled; Ingress load-balances |
| `worker` | `queue:work` | Scale with queue load |
| `scheduler` | `schedule:work` | **Exactly one** replica |
| `migrate` Job | `migrate --force` | Helm post-install / post-upgrade hook |

Managed Postgres, Redis, and object storage live **outside** the app cluster in production. `docker compose` runs them locally for parity.

## Local Compose

```bash
cp .env.docker .env.docker.local   # optional; edit APP_KEY for your machine
docker compose build
docker compose up -d
```

App: http://localhost:8088  
MinIO console: http://localhost:9011 (`gmora` / `gmorasecret`)

Host ports are remapped in `docker-compose.yml` to avoid clashes with other local stacks (Postgres `5436`, Redis `6381`, MinIO `9010`/`9011`).

Roles share image `gmora-stem:local`. Scale web with:

```bash
docker compose up -d --scale app=2
```

(With Redis sessions + MinIO, both replicas stay consistent.)

## Environment matrix

| Variable | Single-node local | Compose / Kubernetes |
|---|---|---|
| `DB_CONNECTION` | `sqlite` | `pgsql` |
| `SESSION_DRIVER` | `database` | `redis` |
| `CACHE_STORE` | `database` | `redis` |
| `QUEUE_CONNECTION` | `database` | `redis` |
| `FILESYSTEM_CLOUD` | `local` | `s3` |
| `LOG_STACK` | `single` | `stderr` |
| `SESSION_SECURE_COOKIE` | unset | `true` behind TLS |

See [`.env.example`](../.env.example) and [`.env.docker`](../.env.docker).

## Kubernetes (Helm)

Prerequisites: Ingress NGINX, cert-manager, kubeconfig, GHCR image pull access.

```bash
helm upgrade --install gmora deploy/helm/gmora \
  -f deploy/helm/gmora/values.yaml \
  -f deploy/helm/gmora/values-staging.yaml \
  --set image.repository=ghcr.io/<org>/stem-gmora \
  --set image.tag=<git-sha> \
  --set secrets.APP_KEY=base64:... \
  --set secrets.DB_PASSWORD=... \
  --set secrets.AWS_ACCESS_KEY_ID=... \
  --set secrets.AWS_SECRET_ACCESS_KEY=... \
  --set config.DB_HOST=... \
  --set config.REDIS_HOST=... \
  --set config.AWS_BUCKET=... \
  --wait
```

Probes: liveness `/up`, readiness `/ready` (DB + Redis when used).

### Staging deploy from CI

1. Push to `main` builds/pushes the image (`.github/workflows/docker.yml`).
2. Run the workflow with **Deploy staging** enabled, or `workflow_dispatch`.
3. Configure GitHub Environment `staging` secrets: `KUBE_CONFIG` (base64 kubeconfig), `STAGING_APP_KEY`, `STAGING_DB_*`, `STAGING_REDIS_*`, `STAGING_AWS_*`.

## Storage migration (local disk → S3)

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_BUCKET=gmora
export AWS_ENDPOINT=https://s3.example.com   # omit for real AWS
export AWS_USE_PATH_STYLE_ENDPOINT=true      # MinIO / some providers

chmod +x deploy/scripts/migrate-storage-to-s3.sh
./deploy/scripts/migrate-storage-to-s3.sh
```

Then set `FILESYSTEM_CLOUD=s3` on all web/worker/scheduler pods and roll the Deployments.

## Dual-replica validation checklist

With ≥2 web pods and Redis + S3 enabled:

1. Log in → refresh → still authenticated (session on Redis).
2. Upload a lesson PDF → open from another pod (load balance via multiple requests).
3. Open an HTML presentation → assets load.
4. Complete a course → certificate job processed by a worker.
5. Hit `/ready` on each pod → 200.

## Runbooks

| Task | Command |
|---|---|
| Scale web | `kubectl scale deploy/<release>-web --replicas=4` |
| Scale workers | `kubectl scale deploy/<release>-worker --replicas=3` |
| Rollback image | `helm rollback gmora 1` |
| Manual migrate | `kubectl run migrate --rm -it --image=... -- migrate` |
| Logs | `kubectl logs -l app.kubernetes.io/component=web -f` |

## Observability

- Application logs go to **stderr** (`LOG_STACK=stderr`) for the cluster log driver.
- Annotate Ingress / pods for Prometheus scrapes as needed in your platform.
- Optional: OpenTelemetry later; not required for v1.
