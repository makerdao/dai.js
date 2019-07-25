#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi

yarn config set version-tag-prefix 'dai-plugin-mcd-v'
yarn config set version-git-message "dai-plugin-mcd-v%s"
yarn version

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')

git push origin dev --no-verify
git push origin "dai-plugin-mcd-v${PACKAGE_VERSION:1}"

CWD=`dirname $0`
rm -rf dist/*
cd ../..
./node_modules/.bin/babel --no-babelrc -d packages/dai-plugin-mcd/dist packages/dai-plugin-mcd/src
cd - >/dev/null
