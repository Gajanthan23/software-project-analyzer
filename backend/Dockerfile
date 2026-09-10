# =============================================================================
# Software Project Analyzer — Backend Dockerfile (Phase 27)
# Node.js + Express REST API microservice container
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# Install git for repo stats or child processes if needed
RUN apk add --no-cache git

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Create workspace temp directory for cloning repos
RUN mkdir -p /tmp/software-analyzer-workspaces

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["npm", "start"]
