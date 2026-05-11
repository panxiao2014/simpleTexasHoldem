#!/bin/bash

# 使用该脚本下载最新的dockre镜像并运行

echo "🔄 更新容器..."
docker pull panxiao2014/simple-poker:latest

# 重启容器
echo "🔄 停止旧容器运行..."
docker stop simple-poker 2>/dev/null || true
docker rm simple-poker 2>/dev/null || true

echo "🔄 启动新容器..."
docker run \
  --name simple-poker \
  -p 80:80 \
  --restart unless-stopped \
  panxiao2014/simple-poker:latest