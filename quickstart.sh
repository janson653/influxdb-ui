#!/bin/bash

# InfluxDB UI 快速启动脚本
# 一键启动 InfluxDB 并配置示例数据

set -e

echo "🚀 InfluxDB UI 快速启动脚本"
echo "================================"

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   Ubuntu/Debian: sudo apt install docker.io"
    echo "   macOS: brew install docker"
    echo "   Windows: 下载 Docker Desktop"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行，请启动 Docker"
    exit 1
fi

# 定义容器名称
CONTAINER_NAME="influxdb-quickstart"
INFLUXDB_PORT=8086
DATABASE_NAME="quickstart"

echo "📦 检查现有容器..."

# 检查容器是否已存在
if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "🔄 发现现有容器 ${CONTAINER_NAME}"
    
    # 检查容器是否运行
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo "✅ 容器正在运行"
    else
        echo "🚀 启动现有容器..."
        docker start ${CONTAINER_NAME}
        sleep 3
    fi
else
    echo "📦 创建新的 InfluxDB 容器..."
    
    # 创建并启动容器
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${INFLUXDB_PORT}:8086 \
        influxdb:1.8-alpine
    
    echo "⏳ 等待 InfluxDB 启动..."
    sleep 5
fi

# 检查容器是否健康
echo "🔍 检查 InfluxDB 健康状态..."
if ! docker exec ${CONTAINER_NAME} influx ping &> /dev/null; then
    echo "❌ InfluxDB 启动失败，请检查日志："
    echo "   docker logs ${CONTAINER_NAME}"
    exit 1
fi

echo "✅ InfluxDB 运行正常"

# 创建数据库
echo "📊 创建示例数据库..."
docker exec ${CONTAINER_NAME} influx \
    -execute "CREATE DATABASE ${DATABASE_NAME}" 2>/dev/null || echo "   数据库已存在"

# 插入示例数据
echo "📈 插入示例数据..."
docker exec ${CONTAINER_NAME} influx \
    -execute "USE ${DATABASE_NAME}" \
    -import /dev/stdin << EOF
# CPU 使用率数据
cpu,host=server1,region=us-west value=45.2
cpu,host=server2,region=us-east value=67.8
cpu,host=server1,region=us-west value=52.1
cpu,host=server2,region=us-east value=73.4

# 内存使用数据
memory,host=server1,region=us-west value=8192
memory,host=server2,region=us-east value=16384
memory,host=server1,region=us-west value=8704
memory,host=server2,region=us-east value=15872

# 磁盘使用数据
disk,host=server1,region=us-west,path=/var value=75.2
disk,host=server2,region=us-east,path=/var value=82.1
disk,host=server1,region=us-west,path=/opt value=45.8
disk,host=server2,region=us-east,path=/opt value=38.9

# 网络流量数据
network,host=server1,region=us-west,direction=in value=1250000
network,host=server2,region=us-east,direction=in value=980000
network,host=server1,region=us-west,direction=out value=850000
network,host=server2,region=us-east,direction=out=720000
EOF

# 显示连接信息
echo ""
echo "🎉 InfluxDB 快速启动完成！"
echo "================================"
echo "📋 连接信息："
echo "   URL: http://localhost:${INFLUXDB_PORT}"
echo "   数据库: ${DATABASE_NAME}"
echo "   用户名: (留空)"
echo "   密码: (留空)"
echo ""
echo "🔧 有用的命令："
echo "   查看容器状态: docker ps"
echo "   查看 InfluxDB 日志: docker logs ${CONTAINER_NAME}"
echo "   停止容器: docker stop ${CONTAINER_NAME}"
echo "   删除容器: docker rm -f ${CONTAINER_NAME}"
echo ""
echo "📊 示例查询："
echo "   SHOW DATABASES"
echo "   SHOW MEASUREMENTS"
echo "   SELECT * FROM cpu WHERE time > now() - 1h"
echo "   SELECT MEAN(value) FROM cpu GROUP BY time(1m), host"
echo ""
echo "🌐 现在可以启动 InfluxDB UI 并连接到数据库！"
echo "   pnpm dev"

# 显示容器状态
echo ""
echo "📦 容器状态："
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"