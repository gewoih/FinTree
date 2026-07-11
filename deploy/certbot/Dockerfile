FROM certbot/certbot:latest

# docker CLI needed for --deploy-hook to reload nginx after cert renewal
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker
