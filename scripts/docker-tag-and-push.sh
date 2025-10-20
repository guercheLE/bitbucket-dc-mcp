#!/bin/bash
# Copyright (c) 2025 Luciano Guerche
# SPDX-License-Identifier: LGPL-3.0-or-later
#
# Docker Tag and Push Script
# Tags and pushes Docker images with version from package.json

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-guerchele}"
IMAGE_NAME="bitbucket-dc-mcp"
FULL_IMAGE_NAME="$DOCKER_USERNAME/$IMAGE_NAME"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}🐳 Docker Tag and Push Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "Image: ${YELLOW}$FULL_IMAGE_NAME${NC}"
echo -e "Version: ${YELLOW}v$VERSION${NC}"
echo ""

# Check if local image exists
if ! docker image inspect "$IMAGE_NAME:latest" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Local image '$IMAGE_NAME:latest' not found${NC}"
    echo -e "${YELLOW}💡 Build the image first:${NC}"
    echo -e "   docker build -t $IMAGE_NAME:latest ."
    exit 1
fi

# Ask for confirmation
read -p "$(echo -e ${YELLOW}Continue with tagging and pushing? [y/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📦 Tagging images...${NC}"

# Tag with version
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME:$VERSION"
echo -e "  ✓ Tagged as ${YELLOW}$FULL_IMAGE_NAME:$VERSION${NC}"

# Tag with latest
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME:latest"
echo -e "  ✓ Tagged as ${YELLOW}$FULL_IMAGE_NAME:latest${NC}"

# Tag with major.minor (e.g., 2.3)
MAJOR_MINOR=$(echo $VERSION | cut -d. -f1,2)
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME:$MAJOR_MINOR"
echo -e "  ✓ Tagged as ${YELLOW}$FULL_IMAGE_NAME:$MAJOR_MINOR${NC}"

# Tag with major (e.g., 2)
MAJOR=$(echo $VERSION | cut -d. -f1)
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME:$MAJOR"
echo -e "  ✓ Tagged as ${YELLOW}$FULL_IMAGE_NAME:$MAJOR${NC}"

echo ""
echo -e "${GREEN}🚀 Pushing images to Docker Hub...${NC}"

# Check if logged in
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${YELLOW}⚠️  Not logged in to Docker Hub${NC}"
    echo -e "${YELLOW}💡 Run: docker login${NC}"
    exit 1
fi

# Push all tags
docker push "$FULL_IMAGE_NAME:$VERSION"
echo -e "  ✓ Pushed ${YELLOW}$FULL_IMAGE_NAME:$VERSION${NC}"

docker push "$FULL_IMAGE_NAME:$MAJOR_MINOR"
echo -e "  ✓ Pushed ${YELLOW}$FULL_IMAGE_NAME:$MAJOR_MINOR${NC}"

docker push "$FULL_IMAGE_NAME:$MAJOR"
echo -e "  ✓ Pushed ${YELLOW}$FULL_IMAGE_NAME:$MAJOR${NC}"

docker push "$FULL_IMAGE_NAME:latest"
echo -e "  ✓ Pushed ${YELLOW}$FULL_IMAGE_NAME:latest${NC}"

echo ""
echo -e "${GREEN}✅ Successfully published Docker images!${NC}"
echo ""
echo -e "${GREEN}📋 Published tags:${NC}"
echo -e "  - $FULL_IMAGE_NAME:$VERSION"
echo -e "  - $FULL_IMAGE_NAME:$MAJOR_MINOR"
echo -e "  - $FULL_IMAGE_NAME:$MAJOR"
echo -e "  - $FULL_IMAGE_NAME:latest"
echo ""
echo -e "${GREEN}🔗 View on Docker Hub:${NC}"
echo -e "  https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME/tags"
