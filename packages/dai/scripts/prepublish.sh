#!/bin/bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

yarn config set version-tag-prefix "dai-v"
yarn config set version-git-message "dai-v%s"
yarn version

./scripts/build-backend.sh
