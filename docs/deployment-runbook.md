# Deployment runbook

## Before the server exists

- Reserve a static DHCP lease for the server.
- Plan local DNS records for `mealie`, `tasks`, `things`, `vault`, and `status` under `home.arpa`.
- Do not forward ports 80/443 from the internet-facing router.
- Remote access is through VPN only.

## First deployment

1. Install Debian Stable, Docker Engine and the Compose plugin from Docker's official repository.
2. Clone this repository to `/opt/apartment-home` and ensure it is owned by the admin account.
3. Run `scripts/generate-secrets.sh`. Vaultwarden admin access stays disabled unless an Argon2-protected token is deliberately added later.
4. Pull each bootstrap image in a staging pass, record its immutable digest in `.env`, and never deploy a mutable `latest` tag with real data.
5. Run `scripts/validate-config.sh` and inspect the rendered configuration without printing `.env`.
6. Start with `docker compose up -d` and inspect container health/logs.
7. Trust Caddy's local root certificate only on household devices that need browser access.
8. Create exactly two household accounts in each service.
9. Set `ALLOW_SIGNUP`, `VIKUNJA_SERVICE_ENABLEREGISTRATION`, `HBOX_OPTIONS_ALLOW_REGISTRATION`, and `SIGNUPS_ALLOWED` to `false`, then recreate the affected containers.
10. Configure Uptime Kuma checks for every public service URL; do not mount the Docker socket.

## Acceptance checks

- No application/database port is published by Docker; only Caddy exposes 80/443.
- Database containers join only the internal backend network.
- All five URLs resolve locally and present trusted TLS after certificate installation.
- Services remain unreachable from mobile data until the VPN is connected.
- Restarting the host restores all containers and preserves data.
- Removing internet access does not stop local logins or core household functions.

## Safety gates before real data

- Complete a backup and restore test for each volume/database.
- Verify UPS shutdown and automatic boot recovery.
- Verify SMART tests and disk-temperature alerts.
- Export and safely store Vaultwarden recovery material separately from the server.

## Backup operation

- Run `BACKUP_ROOT=/mounted/backup scripts/backup.sh` from the repository root using a root-owned systemd timer.
- The script dumps both PostgreSQL databases, archives application volumes, writes SHA-256 checksums, and only lists backups older than 30 days; deletion remains a deliberate administrator action.
- Copy the completed timestamp directory to a physically separate encrypted destination.
- Restore tests must use an isolated Compose project name and must never target production volumes.
