#!/usr/bin/env bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

if [[ -z "$SKIP_VERSION_UPDATE" ]]; then
  yarn version
fi

./scripts/build-backend.sh
