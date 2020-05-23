#!/bin/bash

docker build \
    -t nlesc/spot-server:latest \
    -t nlesc/spot-server:$(date -u +'%d-%m-%Y') \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --force-rm \
    --file ./Docker/Dockerfile \
    .

#time docker push nlesc/spot-server:latest