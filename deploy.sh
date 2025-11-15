#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/linkedin-jobs-api"
CONTAINER_NAME="linkedin-jobs"
IMAGE_NAME="linkedin-jobs:latest"

echo "Changing to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "Fetching latest commit and resetting"
git fetch origin
git reset --hard origin/master

echo "Stopping/removing running container (if any)"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "Building docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "Starting container: $CONTAINER_NAME"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -v "$PROJECT_DIR/data:/app/data" \
  --env-file "$PROJECT_DIR/.env" \
  "$IMAGE_NAME"