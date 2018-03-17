#!/usr/bin/env bash

set -ex

# Start a local testnet on port 2000; set to stop on exit.
./node_modules/.bin/ganache-cli -i 999 -p 2000 -a 1000 -m "hill law jazz limb penalty escape public dish stand bracket blue jar" >/dev/null & netpid=$!
trap "kill $netpid" EXIT

# Wait until it's up, then use it for the deployment.
export ETH_RPC_URL=http://127.1:2000
until curl -s "$ETH_RPC_URL"; do sleep 2; done