#!/bin/bash
set -euo pipefail

# This script mirrors the GitHub Actions build: keep it updated if deployment requirements change.

echo "Cleaning previous build artifacts..."
rm -rf dist deployment

echo "Installing dependencies..."
npm ci

echo "Building project..."
npm run build

echo "Creating deployment bundle..."
mkdir -p deployment
cp -R dist deployment/
cp host.json deployment/
cp package*.json deployment/

echo "Installing production dependencies into deployment bundle..."
pushd deployment >/dev/null
npm ci --omit=dev
popd >/dev/null

echo "Build completed successfully."
