#!/bin/bash
lsof -ti :3000,9090,19001 | xargs -r kill -9
source /Users/yingwu/main/projects/pangolin/.venv/bin/activate
echo "Starting backend..."
python -m uvicorn src.main:app --host 127.0.0.1 --port 9090 &
# The backend will run on 9090
echo "Starting node gateway and frontend via pnpm..."
pnpm pangolin:dev:all --skip-install --skip-doctor &
wait
