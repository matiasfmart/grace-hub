# Dockerfile (Next.js + standalone + Node 24.6.0-alpine)

########## Etapa 1: dependencias ##########
FROM node:24.6.0-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

########## Etapa 2: build ##########
FROM node:24.6.0-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_API_URL is baked into the JS bundle at build time (browser calls)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Asegurate en next.config.ts: export default { output: 'standalone', ... }
RUN npm run build

########## Etapa 3: runtime ##########
FROM node:24.6.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Certificados para HTTPS saliente
RUN apk add --no-cache ca-certificates

# Copiamos solo lo necesario para standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Usuario no-root
RUN addgroup -S app && adduser -S -G app app
USER app

EXPOSE 3000
CMD ["node", "server.js"]