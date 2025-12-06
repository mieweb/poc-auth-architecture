# Nginx SSL Reverse Proxy Setup

This directory contains nginx configuration for running the PoC services behind SSL with custom hostnames.

## Hostname Mapping

| Hostname | Backend Service | Port |
|----------|-----------------|------|
| `auth.local` | auth-server | 4000 |
| `api.local` | api-server | 5001 |
| `bff.local` | app-bff | 3000 |
| `spa.local` | app-spa | 3001 |
| `web.local` | app-web | 3002 |

## Quick Start (SSL Mode)

```bash
# 1. Add hostnames to /etc/hosts
sudo sh -c 'echo "127.0.0.1 auth.local api.local bff.local spa.local web.local" >> /etc/hosts'

# 2. Generate SSL certificates
./scripts/generate-ssl.sh

# 3. Trust the certificate (macOS)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain nginx/ssl/local.crt

# 4. Install nginx (if not installed)
brew install nginx

# 5. Start everything in SSL mode
./scripts/start-ssl.sh
```

## Running Modes

### Standard Mode (no SSL)
```bash
./scripts/start.sh
```
Access via: `http://localhost:3000`, `http://localhost:3001`, etc.

### SSL Mode
```bash
./scripts/start-ssl.sh
```
Access via: `https://bff.local`, `https://spa.local`, etc.

## Manual Setup

### 1. Add hostnames to /etc/hosts

```bash
sudo sh -c 'echo "127.0.0.1 auth.local api.local bff.local spa.local web.local" >> /etc/hosts'
```

Or manually edit `/etc/hosts` and add:
```
127.0.0.1 auth.local api.local bff.local spa.local web.local
```

### 2. Generate SSL certificates

```bash
./scripts/generate-ssl.sh
```

### 3. Trust the certificate (macOS)

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain nginx/ssl/local.crt
```

Or open Keychain Access, import `nginx/ssl/local.crt`, and set it to "Always Trust".

### 4. Install and configure nginx

#### Using Homebrew (macOS)

```bash
brew install nginx

# Create symlink to our config
sudo ln -sf $(pwd)/nginx/nginx.conf /opt/homebrew/etc/nginx/servers/poc-auth.conf

# Or copy the config
sudo cp nginx/nginx.conf /opt/homebrew/etc/nginx/servers/poc-auth.conf

# Create SSL directory and copy certs
sudo mkdir -p /etc/nginx/ssl
sudo cp nginx/ssl/local.* /etc/nginx/ssl/

# Test configuration
nginx -t

# Start nginx
brew services start nginx
```

#### Using Docker

```bash
docker run -d \
  --name poc-auth-nginx \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -v $(pwd)/nginx/ssl:/etc/nginx/ssl:ro \
  --add-host=host.docker.internal:host-gateway \
  nginx:alpine
```

Note: For Docker, update `nginx.conf` to use `host.docker.internal` instead of `127.0.0.1`.

### 5. Update application configurations

The applications need to be configured to use the new HTTPS hostnames. Environment variables or config changes are required:

#### auth-server
The issuer URL changes from `http://localhost:4000` to `https://auth.local`

#### app-bff, app-spa, app-web
Update redirect URIs and auth server URLs to use HTTPS hostnames.

## Testing

After setup, access the apps at:
- https://auth.local - OIDC Provider
- https://api.local - Protected API
- https://bff.local - BFF Pattern App
- https://spa.local - SPA with PKCE
- https://web.local - Traditional Web App

## Troubleshooting

### Certificate not trusted
- Make sure you've added the certificate to your system keychain
- Restart your browser after trusting the certificate

### nginx won't start
- Check if another process is using ports 80/443
- Run `nginx -t` to test configuration syntax
- Check logs: `tail -f /opt/homebrew/var/log/nginx/error.log`

### Redirect URI mismatch
- Update the OIDC client configurations in `auth-server/src/config.js` with the new HTTPS URLs
