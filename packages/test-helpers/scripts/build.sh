#!/bin/bash
set -e
babel -d dist src
cp src/testAccounts.json dist
