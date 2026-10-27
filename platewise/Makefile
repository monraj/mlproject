.PHONY: setup server test lint app sync-foods

setup:            ## install server and app dependencies
	cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd mobile && npm install

server:           ## run the API on your network so the phone can reach it
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

app:              ## start Expo; scan the QR code with Expo Go
	cd mobile && npx expo start

test:             ## server + app tests
	cd backend && .venv/bin/python -m pytest -q
	cd mobile && npx jest

lint:
	cd backend && .venv/bin/ruff check app tests && .venv/bin/mypy
	cd mobile && npx tsc --noEmit

sync-foods:       ## copy the server's food table into the app after editing it
	cd mobile && npm run sync-foods
