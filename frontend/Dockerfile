# =============================================================================
# Software Project Analyzer — Frontend Dockerfile (Phase 27)
# Multi-stage build: React + Vite build stage -> Nginx static serving stage
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build static web assets
# -----------------------------------------------------------------------------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy application source code
COPY . .

# Build argument for API endpoint
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle to /app/dist
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve via Nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production-stage

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static built assets from Stage 1
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
