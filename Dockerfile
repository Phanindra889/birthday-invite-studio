# Production image for Render (or any Docker host): editor + MP4 render API.
FROM node:22-bookworm-slim

# System libraries required by Remotion's headless Chrome.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
# Download the headless browser at build time instead of on the first export.
RUN npx remotion browser ensure
COPY . .
RUN npm run build

ENV NODE_ENV=production RENDER_CONCURRENCY=1
EXPOSE 10000
CMD ["npm", "start"]
