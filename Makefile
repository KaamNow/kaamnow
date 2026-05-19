# KaamNow v2 — Dev Commands

.PHONY: help dev-backend dev-mobile test deploy-dev logs clean

help:
	@echo ""
	@echo "  KaamNow v2 — Available Commands"
	@echo ""
	@echo "  make dev-backend    Start backend with Doppler (hot reload)"
	@echo "  make dev-mobile     Start Expo mobile app"
	@echo "  make test           Run full pytest suite"
	@echo "  make test-fast      Run tests, stop on first fail"
	@echo "  make deploy-dev     Deploy to dev k8s cluster"
	@echo "  make logs           Tail backend logs from k8s"
	@echo "  make db             Open MongoDB shell on dev DB"
	@echo "  make lint           Run black + isort + flake8"
	@echo "  make format         Auto-format backend code"
	@echo "  make clean          Remove .pyc files and caches"
	@echo ""

dev-backend:
	doppler run -- uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

dev-mobile:
	cd mobile && npx expo start

test:
	pytest tests/ -v

test-fast:
	pytest tests/ -x -v

test-watch:
	pytest tests/ -v --tb=short -f

deploy-dev:
	sudo bash deploy/deploy-dev.sh

logs:
	kubectl -n kaamnow-dev logs -f deployment/backend

db:
	mongosh "mongodb+srv://kaamnow-dev:KaamNowDev123@kaamnow-dev.p0wka3b.mongodb.net/kaamnow_dev"

lint:
	cd backend && flake8 . --max-line-length=100 --exclude=__pycache__
	cd backend && mypy . --ignore-missing-imports

format:
	cd backend && black . && isort .

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
