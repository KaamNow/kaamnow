.PHONY: help deploy redeploy logs status destroy mongo-shell rebuild-backend rebuild-frontend cert-status

CLUSTER ?= kaamnow
NS      ?= kaamnow

help:
	@echo "KaamNow — kind deployment commands"
	@echo ""
	@echo "  make deploy             Full first-time deploy (run as: sudo make deploy LE_EMAIL=you@x.com)"
	@echo "  make redeploy           Rebuild images + restart pods (after code changes)"
	@echo "  make rebuild-backend    Rebuild + restart only backend"
	@echo "  make rebuild-frontend   Rebuild + restart only frontend"
	@echo "  make logs APP=backend   Tail logs (APP=backend|frontend|mongodb)"
	@echo "  make status             Show pods, services, ingress, certs"
	@echo "  make cert-status        Check Let's Encrypt cert status"
	@echo "  make mongo-shell        Open mongosh inside MongoDB pod"
	@echo "  make destroy            Tear down everything (cluster + images)"

deploy:
	sudo LE_EMAIL=$(LE_EMAIL) bash deploy/deploy.sh

redeploy: rebuild-backend rebuild-frontend
	@echo "Redeploy complete."

rebuild-backend:
	docker build -t kaamnow/backend:latest -f deploy/Dockerfile.backend .
	kind load docker-image kaamnow/backend:latest --name $(CLUSTER)
	kubectl -n $(NS) rollout restart deployment/backend
	kubectl -n $(NS) rollout status deployment/backend

rebuild-frontend:
	docker build --build-arg REACT_APP_BACKEND_URL="" -t kaamnow/frontend:latest -f deploy/Dockerfile.frontend .
	kind load docker-image kaamnow/frontend:latest --name $(CLUSTER)
	kubectl -n $(NS) rollout restart deployment/frontend
	kubectl -n $(NS) rollout status deployment/frontend

logs:
	@if [ -z "$(APP)" ]; then echo "Usage: make logs APP=backend|frontend|mongodb"; exit 1; fi
	kubectl -n $(NS) logs -l app=$(APP) --tail=200 -f

status:
	@echo "--- PODS ---"
	kubectl -n $(NS) get pods -o wide
	@echo "--- SERVICES ---"
	kubectl -n $(NS) get svc
	@echo "--- INGRESS ---"
	kubectl -n $(NS) get ingress
	@echo "--- CERTS ---"
	kubectl -n $(NS) get certificate || true

cert-status:
	kubectl -n $(NS) describe certificate kaamnow-tls

mongo-shell:
	kubectl -n $(NS) exec -it mongodb-0 -- mongosh kaamnow_db

destroy:
	kind delete cluster --name $(CLUSTER) || true
	docker rmi kaamnow/backend:latest kaamnow/frontend:latest 2>/dev/null || true
	@echo "Cluster destroyed."
