#!/bin/sh
set -e

: "${NGINX_SERVER_NAME:=localhost}"
: "${NGINX_SSL_CERT:=/etc/letsencrypt/live/${NGINX_SERVER_NAME}/fullchain.pem}"
: "${NGINX_SSL_KEY:=/etc/letsencrypt/live/${NGINX_SERVER_NAME}/privkey.pem}"

if [ ! -f "$NGINX_SSL_CERT" ] || [ ! -f "$NGINX_SSL_KEY" ]; then
  mkdir -p "$(dirname "$NGINX_SSL_CERT")" "$(dirname "$NGINX_SSL_KEY")"
  openssl req -x509 -nodes -newkey rsa:2048 -days 7 \
    -keyout "$NGINX_SSL_KEY" \
    -out "$NGINX_SSL_CERT" \
    -subj "/CN=${NGINX_SERVER_NAME}"
fi

envsubst '$NGINX_SERVER_NAME $NGINX_SSL_CERT $NGINX_SSL_KEY' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
