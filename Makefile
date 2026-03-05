.PHONY: help deploy start stop restart logs status health backup clean update

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deploy: ## Deploy the application (first time setup)
	@echo "Deploying Acadistra..."
	@./deploy.sh

start: ## Start all services
	@echo "Starting services..."
	@docker compose -f docker-compose.prod.yml up -d

stop: ## Stop all services
	@echo "Stopping services..."
	@docker compose -f docker-compose.prod.yml down

restart: ## Restart all services
	@echo "Restarting services..."
	@docker compose -f docker-compose.prod.yml restart

logs: ## View logs from all services
	@docker compose -f docker-compose.prod.yml logs -f

status: ## Show status of all services
	@docker compose -f docker-compose.prod.yml ps

health: ## Run health check
	@./health-check.sh

backup: ## Create a backup
	@echo "Creating backup..."
	@./scripts/backup.sh

clean: ## Stop services and remove volumes (WARNING: deletes data)
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f docker-compose.prod.yml down -v; \
		echo "All services stopped and data removed"; \
	fi

update: ## Update application from git and rebuild
	@echo "Updating application..."
	@git pull origin main
	@docker compose -f docker-compose.prod.yml up -d --build
	@echo "Update complete"

migrate: ## Run database migrations
	@echo "Running migrations..."
	@docker exec acadistra_backend ./main migrate

seed-admin: ## Create admin user
	@echo "Creating admin user..."
	@docker exec acadistra_backend ./main seed-admin

seed-subjects: ## Seed standard subjects
	@echo "Seeding standard subjects..."
	@docker exec acadistra_backend ./main seed-standard-subjects

db-shell: ## Open PostgreSQL shell
	@docker exec -it acadistra_postgres psql -U acadistra -d acadistra

redis-shell: ## Open Redis CLI
	@docker exec -it acadistra_redis redis-cli -a $${REDIS_PASSWORD:-redis}

backend-shell: ## Open backend container shell
	@docker exec -it acadistra_backend sh

frontend-shell: ## Open frontend container shell
	@docker exec -it acadistra_frontend sh

dev-backend: ## Run backend in development mode
	@cd backend && go run cmd/api/main.go

dev-frontend: ## Run frontend in development mode
	@cd frontend && npm run dev

test-backend: ## Run backend tests
	@cd backend && go test ./... -v

build: ## Build all Docker images
	@docker compose -f docker-compose.prod.yml build

pull: ## Pull latest Docker images
	@docker compose -f docker-compose.prod.yml pull
