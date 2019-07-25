#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-migrations" ]; then
  echo "This script must be run from the dai-plugin-migrations directory."
  exit
fi

yarn config set version-tag-prefix 'dai-plugin-migrations-v'
yarn config set version-git-message "dai-plugin-migrations-v%s"
yarn version

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')

git push origin dev --no-verify
git push origin "dai-plugin-migrations-v${PACKAGE_VERSION:1}"

CWD=`dirname $0`
rm -rf dist/*
cd ../..
./node_modules/.bin/babel --no-babelrc -d packages/dai-plugin-migrations/dist packages/dai-plugin-migrations/src
cd - >/dev/null
