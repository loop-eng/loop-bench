#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="${REGISTRY:-loop-bench}"

echo "Building base images..."

docker build -t "${REGISTRY}/base-node:20" -f "${SCRIPT_DIR}/base/Dockerfile.node" "${SCRIPT_DIR}/base"
docker build -t "${REGISTRY}/base-python:3.12" -f "${SCRIPT_DIR}/base/Dockerfile.python" "${SCRIPT_DIR}/base"
docker build -t "${REGISTRY}/base-go:1.24" -f "${SCRIPT_DIR}/base/Dockerfile.go" "${SCRIPT_DIR}/base"

echo "All base images built successfully."
