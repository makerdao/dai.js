#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi
CWD=`dirname $0`
rm -r dist/*
$CWD/../../../node_modules/.bin/babel -d dist src
