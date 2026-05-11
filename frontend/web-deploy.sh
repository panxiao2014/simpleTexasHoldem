#!/bin/bash
# deploy-remote.sh
set -e

echo "🚀 Start to dploy..."

cd /opt/simpleTexasHoldem
git pull

# 加载环境变量
# 需要在/root/web3-prod/.env.production中设置以下环境变量：
# VITE_CONVEX_URL=your-convex-project-production-url
# VITE_CHAIN_CONFIG=sepolia
# VITE_CONTRACT_ADDRESS=your-deployed-contract-address
# VITE_CONTRACT_OWNER_ADDRESS=your-wallet-address
# VITE_INFURA_API_URL=https://sepolia.infura.io/v3/your-infura-api-key
echo "从/root/web3-prod/.env.production加载环境变量..."
set -a
source /root/web3-prod/.env.production
set +a

# 部署 Convex 后端 - 使用 Deploy Key 实现非交互式部署
echo "☁️  部署 Convex 后端到生产环境..."
cd /opt/simpleTexasHoldem/frontend
npx convex deploy --yes

# 构建 Docker 镜像
echo "🏗️  构建 Docker 镜像..."
cd /opt/simpleTexasHoldem
docker build \
  --build-arg VITE_CONVEX_URL="${VITE_CONVEX_URL}" \
  --build-arg VITE_CHAIN_CONFIG="${VITE_CHAIN_CONFIG}" \
  --build-arg VITE_CONTRACT_ADDRESS="${VITE_CONTRACT_ADDRESS}" \
  --build-arg VITE_CONTRACT_OWNER_ADDRESS="${VITE_CONTRACT_OWNER_ADDRESS}" \
  --build-arg VITE_INFURA_API_URL="${VITE_INFURA_API_URL}" \
  -t simple-poker:latest \
  -f frontend/Dockerfile \
  ./frontend

# 给 Docker 镜像打标签
echo "🏷️ 给 Docker 镜像打标签..."
docker tag simple-poker:latest panxiao2014/simple-poker:latest

# 推送 Docker 镜像到 Docker Hub
echo "📤 推送 Docker 镜像到 Docker Hub..."
docker push panxiao2014/simple-poker:latest

# 重启容器
echo "🔄 停止旧容器运行..."
docker stop simple-poker 2>/dev/null || true
docker rm simple-poker 2>/dev/null || true

echo "🔄 启动新容器..."
docker run -d \
  --name simple-poker \
  -p 80:80 \
  --restart unless-stopped \
  panxiao2014/simple-poker:latest

echo "✅ 部署完成！"