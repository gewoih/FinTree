FROM node:25-alpine AS build
WORKDIR /app
COPY vue-app/package*.json ./
RUN npm ci
COPY vue-app/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.29-alpine
RUN apk add --no-cache openssl gettext
COPY deploy/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deploy/nginx/entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
