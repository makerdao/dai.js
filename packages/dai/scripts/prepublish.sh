#!/bin/bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

lerna version --tag-version-prefix="dai-v" --conventional-commits --create-release github
CWD=`dirname $0`
rm -rf dist/*
cd ../..
./build-backend.sh
cd - >/dev/null
