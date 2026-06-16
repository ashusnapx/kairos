#!/usr/bin/env bash
set -e

case "${1:-up}" in
  up)
    echo "Killing stale processes..."
    kill $(lsof -ti :3000) 2>/dev/null || true
    kill $(lsof -ti :8000) 2>/dev/null || true
    sleep 1

    echo "Starting Docker infra (postgres, redis, neo4j)..."
    docker compose up -d postgres redis neo4j 2>/dev/null || true

    echo "Starting backend (uvicorn)..."
    cd "$(dirname "$0")/backend"
    source .venv/bin/activate 2>/dev/null || true
    nohup uvicorn src.main:app --reload --port 8000 > /tmp/be.log 2>&1 &
    echo "  Backend PID $!"

    echo "Starting frontend (next dev)..."
    cd "$(dirname "$0")/frontend"
    nohup npx next dev > /tmp/fe.log 2>&1 &
    echo "  Frontend PID $!"

    echo "Waiting for backend..."
    for i in $(seq 1 15); do
      if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "  Backend ready"
        break
      fi
      sleep 1
    done

    echo "Waiting for frontend..."
    for i in $(seq 1 20); do
      if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo "  Frontend ready"
        break
      fi
      sleep 1
    done

    echo ""
    echo "  Frontend : http://localhost:3000"
    echo "  Backend  : http://localhost:8000"
    echo "  Logs     : ./dev.sh logs"
    echo "  Stop     : ./dev.sh stop"
    echo ""
  stop)
    echo "Stopping..."
    kill $(lsof -ti :3000) 2>/dev/null || true
    kill $(lsof -ti :8000) 2>/dev/null || true
    echo "Stopped"
    ;;
  logs)
    tail -f /tmp/be.log /tmp/fe.log
    ;;
  *)
    echo "Usage: ./dev.sh [up|stop|logs]"
    ;;
esac
