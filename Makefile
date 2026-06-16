.PHONY: up down seed bench dev-backend dev-frontend

up:
	docker-compose up -d

down:
	docker-compose down

seed:
	cd backend && python scripts/seed_data.py $(N)

bench:
	cd backend && python scripts/benchmark.py

dev-backend:
	cd backend && uvicorn src.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

rocm-up:
	docker compose -f docker-compose.rocm.yml up -d

rocm-down:
	docker compose -f docker-compose.rocm.yml down
