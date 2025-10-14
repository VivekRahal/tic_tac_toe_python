# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests first for better caching
COPY package.json package-lock.json* ./

# Install dependencies (prefer lockfile when present)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application code
COPY . .

# Allow overriding backend base at build time; default to empty string so SPA uses relative /api proxy
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

# Runtime stage
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

ENV NODE_ENV=production

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
