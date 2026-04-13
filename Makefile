.PHONY: help install dev test build docker-build docker-up docker-down deploy clean

help:
	@echo "Grocio - Multi-Tenant Grocery Management System"
	@echo ""
	@echo "Available commands:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Start development environment (Docker + servers)"
	@echo "  make test          - Run test suite"
	@echo "  make build         - Build for production"
	@echo "  make docker-build  - Build Docker images"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-logs   - View Docker logs"
	@echo "  make deploy        - Deploy to production (requires setup)"
	@echo "  make clean         - Clean up build artifacts"
	@echo "  make lint          - Run ESLint"
	@echo "  make type-check    - Run TypeScript type checker"
	@echo "  make seed          - Seed database with test data"
	@echo ""

install:
	@echo "Installing dependencies..."
	pnpm install

dev:
	@echo "Starting development environment..."
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	sleep 10
	pnpm install
	pnpm --filter api prisma migrate dev
	pnpm dev

test:
	@echo "Running test suite..."
	pnpm test --run

test-watch:
	@echo "Running tests in watch mode..."
	pnpm test

test-security:
	@echo "Running security tests..."
	pnpm test -- tests/security/ --run

coverage:
	@echo "Generating coverage report..."
	pnpm test --run --coverage

build:
	@echo "Building for production..."
	pnpm install --frozen-lockfile
	pnpm --filter api build
	pnpm --filter web build

docker-build:
	@echo "Building Docker images..."
	docker build -f Dockerfile -t grocio-api:latest .
	docker build -f apps/web/Dockerfile -t grocio-web:latest .

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	sleep 5
	docker-compose exec -T postgres pg_isready -U grocio_user || exit 1
	docker-compose exec -T redis redis-cli ping || exit 1
	@echo "Services are ready!"
	@echo "API: http://localhost:3001"
	@echo "Web: http://localhost:3000"

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-logs-api:
	docker-compose logs -f api

docker-logs-web:
	docker-compose logs -f web

docker-logs-postgres:
	docker-compose logs -f postgres

docker-logs-redis:
	docker-compose logs -f redis

docker-ps:
	docker-compose ps

seed:
	@echo "Seeding database..."
	pnpm --filter api prisma db seed

migrate-dev:
	@echo "Running database migrations (dev mode)..."
	pnpm --filter api prisma migrate dev

migrate-deploy:
	@echo "Deploying database migrations..."
	pnpm --filter api prisma migrate deploy

migrate-reset:
	@echo "Resetting database (development only)..."
	pnpm --filter api prisma migrate reset

prisma-studio:
	@echo "Starting Prisma Studio..."
	pnpm --filter api prisma studio

lint:
	@echo "Running ESLint..."
	pnpm lint

format:
	@echo "Formatting code..."
	pnpm format

format-check:
	@echo "Checking code formatting..."
	pnpm format:check

type-check:
	@echo "Running TypeScript type checker..."
	pnpm type-check

deploy:
	@echo "Deploying to production..."
	@echo "NOTE: Configure deployment target (AWS, GCP, etc.) before running"
	git push origin main
	@echo "Push successful. GitHub Actions will deploy automatically."

clean:
	@echo "Cleaning up..."
	rm -rf node_modules
	rm -rf apps/api/dist
	rm -rf apps/api/.next
	rm -rf apps/web/.next
	rm -rf apps/web/dist
	rm -rf coverage
	rm -rf .turbo
	@echo "Clean complete!"

reset:
	@echo "Resetting environment (removes containers, volumes, node_modules)..."
	docker-compose down -v
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf apps/api/dist
	rm -rf apps/web/.next
	rm -rf coverage
	@echo "Reset complete!"

# Development shortcuts
logs:
	@docker-compose logs -f api

shell-api:
	@docker-compose exec api sh

shell-db:
	@docker-compose exec postgres psql -U grocio_user -d grocio_dev

db-backup:
	@mkdir -p backups
	@echo "Backing up database..."
	@docker-compose exec -T postgres pg_dump -U grocio_user grocio_dev > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup complete!"

db-restore:
	@echo "Restoring database from latest backup..."
	@cat backups/backup_*.sql | docker-compose exec -T postgres psql -U grocio_user -d grocio_dev
	@echo "Restore complete!"

db-stats:
	@docker-compose exec postgres psql -U grocio_user -d grocio_dev -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC;"

redis-cli:
	@docker-compose exec redis redis-cli

redis-info:
	@docker-compose exec redis redis-cli INFO

# Health checks
health:
	@curl -s http://localhost:3001/health | jq .

ready:
	@curl -s http://localhost:3001/ready | jq .

# CI/CD
ci-test:
	pnpm install --frozen-lockfile
	pnpm test --run

ci-build:
	pnpm install --frozen-lockfile
	pnpm --filter api build
	pnpm --filter web build

ci-lint:
	pnpm install --frozen-lockfile
	pnpm lint
	pnpm type-check

# Utility
env-example:
	@echo "Creating .env.local from .env.example..."
	@test -f .env.local || cp .env.example .env.local
	@echo "Created .env.local. Edit with your configuration."

version:
	@grep '"version"' package.json | head -1 | awk -F'"' '{print $$4}'

# Docker production
docker-prod-build:
	@echo "Building production Docker images..."
	docker build -f Dockerfile -t grocio-api:prod .
	docker build -f apps/web/Dockerfile -t grocio-web:prod .

docker-prod-up:
	@echo "Starting production containers..."
	docker-compose -f docker-compose.prod.yml up -d

docker-prod-down:
	@echo "Stopping production containers..."
	docker-compose -f docker-compose.prod.yml down
