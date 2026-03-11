#!/bin/bash
# NEXUS OS 24/7 Runner - Auto-restart on crash
cd /home/z/my-project
mkdir -p logs

echo "[$(date)] NEXUS 24/7 Runner started" >> logs/runner.log

while true; do
    echo "[$(date)] Starting NEXUS..." >> logs/runner.log
    npm run dev 2>&1 | tee logs/nexus.log
    echo "[$(date)] NEXUS stopped! Restarting in 3 seconds..." >> logs/runner.log
    sleep 3
done
