FROM golang:1.24-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

LABEL org.opencontainers.image.source="https://github.com/loop-eng/loop-bench"
LABEL org.opencontainers.image.description="Loop-Bench Go base image"
