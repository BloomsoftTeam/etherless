#!/bin/bash
kill `ps aux | grep "node" | awk '{ print $2; }' | head -1`
cd /home/ec2-user/etherless
node_modules/ts-node/dist/bin.js server/index.ts 2>&1 >> logs &

