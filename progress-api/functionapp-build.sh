#!/bin/bash

# Clean the dist directory
rm -rf dist

# Install dependencies
npm ci

# Build the project
npm run build

# Create the function directory structure
mkdir -p dist/src/functions/adminSummary

# Copy function files
cp -r dist/functions/adminSummary/* dist/src/functions/adminSummary/
cp src/functions/adminSummary/function.json dist/src/functions/adminSummary/

# Copy other necessary files
cp host.json dist/
cp package*.json dist/
cp -r node_modules dist/

# Create a dummy function to ensure the directory exists
mkdir -p dist/src/functions/adminSummary

echo "Build completed successfully"
