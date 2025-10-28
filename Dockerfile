FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

RUN apk add --no-cache nginx redis

# Copy official main nginx config (defines http{}, etc.)
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy only your server block file
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY .env .env
EXPOSE 80

CMD sh -c "redis-server --daemonize yes && npm start & nginx -g 'daemon off;'"
