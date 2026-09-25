.DEFAULT_GOAL := help
.PHONY: docker-build docker-up build start log stop restart

DOCKER_COMPOSE_DEV=docker compose -f docker-compose-dev.yml --env-file frontend/.env --env-file frontend/.env.local
# Override to build/publish another deployment, e.g. `make publish-frontend PROD_ENV_FILE=.env.production.dev.local`
PROD_ENV_FILE ?= .env.production.local
DOCKER_COMPOSE_PROD=docker compose -f docker-compose-prod.yml --env-file .env.production --env-file $(PROD_ENV_FILE)

# Dev commands

start:
	$(DOCKER_COMPOSE_DEV) up -d

stop:
	$(DOCKER_COMPOSE_DEV) kill
	$(DOCKER_COMPOSE_DEV) rm -fv

config:
	$(DOCKER_COMPOSE_DEV) config

upgrade:
	$(DOCKER_COMPOSE_DEV) pull
	$(DOCKER_COMPOSE_DEV) up -d

attach-activitypods:
	$(DOCKER_COMPOSE_DEV) exec activitypods-backend pm2 attach 0

# Prod commands

build-prod:
	$(DOCKER_COMPOSE_PROD) build

start-prod:
	$(DOCKER_COMPOSE_PROD) up -d

stop-prod:
	$(DOCKER_COMPOSE_PROD) kill
	$(DOCKER_COMPOSE_PROD) rm -fv

config-prod:
	$(DOCKER_COMPOSE_PROD) config

upgrade-prod:
	$(DOCKER_COMPOSE_PROD) pull
	$(DOCKER_COMPOSE_PROD) up -d

attach-backend-prod:
	$(DOCKER_COMPOSE_PROD) exec app-backend pm2 attach 0

# Publish commands

publish-frontend:
	TAG=`git describe --tags --abbrev=0` $(DOCKER_COMPOSE_PROD) build app-frontend
	TAG=`git describe --tags --abbrev=0` $(DOCKER_COMPOSE_PROD) push app-frontend

publish-backend:
	TAG=`git describe --tags --abbrev=0` $(DOCKER_COMPOSE_PROD) build app-backend
	TAG=`git describe --tags --abbrev=0` $(DOCKER_COMPOSE_PROD) push app-backend

publish-frontend-latest:
	TAG=latest $(DOCKER_COMPOSE_PROD) build app-frontend
	TAG=latest $(DOCKER_COMPOSE_PROD) push app-frontend

publish-backend-latest:
	TAG=latest $(DOCKER_COMPOSE_PROD) build app-backend
	TAG=latest $(DOCKER_COMPOSE_PROD) push app-backend
