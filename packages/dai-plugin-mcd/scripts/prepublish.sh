#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi

yarn config set version-tag-prefix "dai-plugin-mcd-v"
yarn config set version-git-message "dai-plugin-mcd-v%s"
yarn version

./scripts/build.sh
