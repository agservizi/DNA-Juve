#!/bin/bash
set -e
set -x
echo "Starting build..."
pwd
ls -la
cd experience
pwd
ls -la
npm --version
node --version
npm install --include=dev
npm run build
echo "Build completed successfully"
