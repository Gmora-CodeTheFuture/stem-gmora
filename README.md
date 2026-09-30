# Gmora STEM

Laravel + Inertia (React) learning platform. Production targets **Docker** and **Kubernetes** with Redis sessions, Postgres, and S3-compatible object storage so the app can run behind a load balancer with multiple replicas.

## Quick start (local PHP)

```bash
composer setup
php artisan serve
npm run dev
```

## Enterprise local stack (Compose)

```bash
docker compose build
docker compose up -d
```

- App: http://localhost:8088  
- MinIO: http://localhost:9011  

See [deploy/README.md](deploy/README.md) for architecture, Helm install, CI image publish, storage migration, and dual-replica checks.

## Tests

```bash
php artisan test
npm test
```

CI runs lint, PHPUnit (sqlite + pgsql), frontend tests, and Playwright. Docker/Helm lint and image publish are in [`.github/workflows/docker.yml`](.github/workflows/docker.yml).
