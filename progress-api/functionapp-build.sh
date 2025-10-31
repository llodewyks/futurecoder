#!/bin/bash

# Clean and prepare
echo "Cleaning previous build..."
rm -rf dist

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the project
echo "Building project..."
npm run build

# Create the function directory structure
echo "Creating directory structure..."
mkdir -p dist/functions/adminSummary

# Copy function files
echo "Copying function files..."
cp -r dist/src/functions/adminSummary/* dist/functions/adminSummary/
cp src/functions/adminSummary/function.json dist/functions/adminSummary/

# Move files to root for Azure Functions
echo "Preparing for Azure Functions..."
cp -r dist/functions/* ./
cp host.json ./
cp package*.json ./

# Create a symbolic link to move functions to the root
# This is needed because Azure Functions expects the functions to be in the root
ln -s src/functions functions

# Install production dependencies
echo "Installing production dependencies..."
npm install --production

echo "Build completed successfully"
