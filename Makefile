.PHONY: install start start-local local-api api-types check test build audit

# Dependencies, and the git hooks when pre-commit is installed.
install:
	@pnpm install --frozen-lockfile
	@if command -v pre-commit >/dev/null 2>&1; then pre-commit install; else echo "pre-commit not installed; skipping its hooks"; fi

# The console on http://localhost:3000/orcasonar/ against OrcaSonar dev, signed in through dev Cognito, with the API
# types fresh from dev's contract, as orca-ui-v2's `make start` does. Needs `aws sso login --profile dev` first.
start: api-types
	@pnpm start

# The console on http://localhost:3000/orcasonar/ against OrcaSonar's in-memory API, where nobody signs in. Run
# `make local-api` in another terminal first. PORT picks another port.
start-local:
	@pnpm dev

# OrcaSonar's in-memory API on http://127.0.0.1:8787, from a checkout of umccr/orcasonar beside this one.
local-api:
	@$(MAKE) -C ../orcasonar dev

# src/api/schema.d.ts from OrcaSonar dev's contract. ORCASONAR_OPENAPI names another file or URL, such as
# ../orcasonar/app/schema/openapi.yaml for API changes not yet in dev.
api-types:
	@pnpm api:types

# Types, lint, formatting and tests, as the pull request checks run them.
check:
	@pnpm check

test:
	@pnpm test

build:
	@pnpm build

audit:
	@pnpm audit --prod
