# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
# python3/make/g++: fallback in case no prebuilt bcrypt binary matches this
# platform (bcrypt ships prebuilds for both glibc and musl via
# `prebuildify --napi --tag-libc`, so this is a safety net, not the common
# path). Stripped from the final image below either way.
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
# Removes devDependencies from the already-installed tree (no second native
# compile pass for bcrypt, unlike a fresh `npm ci --omit=dev` would trigger).
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# dist/ requires the generated Prisma client via a relative path that climbs
# out of dist/ to ../../../prisma/generated/prisma — both must be copied at
# the same relative position, not just dist/ on its own.
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma/generated ./prisma/generated
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 3000

# /health is VERSION_NEUTRAL and skips the rate limiter by design — see
# health.controller.ts. No curl on Alpine by default, so this uses Node's
# own http module instead of adding a package just for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
