#!/bin/bash
# Syncs the working file to the GitHub Pages repo and publishes.
set -e
cp ~/sloan-canvas.html ~/sloan-canvas/index.html
cd ~/sloan-canvas
git add -A
git commit -q -m "${1:-update}" || { echo "Nothing to deploy."; exit 0; }
git push -q
echo "Deployed → https://riteshmsrivastava-pixel.github.io/sloan-canvas/"
