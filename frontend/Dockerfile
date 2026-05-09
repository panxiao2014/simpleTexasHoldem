FROM node:20-alpine AS builder
WORKDIR /simpleTexasHoldem/frontend
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --ignore-scripts
COPY . .


ARG VITE_CONVEX_URL
ARG VITE_CHAIN_CONFIG
ARG VITE_CONTRACT_ADDRESS
ARG VITE_CONTRACT_OWNER_ADDRESS
ARG VITE_INFURA_API_URL

ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CHAIN_CONFIG=$VITE_CHAIN_CONFIG
ENV VITE_CONTRACT_ADDRESS=$VITE_CONTRACT_ADDRESS
ENV VITE_CONTRACT_OWNER_ADDRESS=$VITE_CONTRACT_OWNER_ADDRESS
ENV VITE_INFURA_API_URL=$VITE_INFURA_API_URL

RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /simpleTexasHoldem/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]