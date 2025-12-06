#!/bin/bash
# Generate self-signed SSL certificates for local development
# Creates a wildcard certificate for *.local domains

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="$SCRIPT_DIR/../nginx/ssl"

mkdir -p "$SSL_DIR"

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/local.key" \
    -out "$SSL_DIR/local.crt" \
    -subj "/C=US/ST=Local/L=Local/O=Development/CN=*.local" \
    -addext "subjectAltName=DNS:auth.local,DNS:api.local,DNS:bff.local,DNS:spa.local,DNS:web.local,DNS:localhost"

echo "✅ SSL certificates generated in $SSL_DIR"
echo ""
echo "Files created:"
echo "  - $SSL_DIR/local.key (private key)"
echo "  - $SSL_DIR/local.crt (certificate)"
echo ""
echo "To trust the certificate on macOS, run:"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $SSL_DIR/local.crt"
echo ""
echo "Or import it manually in Keychain Access and set it to 'Always Trust'"
