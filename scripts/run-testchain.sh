#!/usr/bin/env bash
set -e

CWD="${0%/*}"


$CWD/../node_modules/@makerdao/testchain/scripts/launch -s default --fast $@
