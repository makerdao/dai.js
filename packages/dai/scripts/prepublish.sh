#!/usr/bin/env bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

./scripts/build-backend.sh
