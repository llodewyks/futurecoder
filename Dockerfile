# ---------- build stage ----------
FROM python:3.12.1-slim AS build

ARG NODE_MAJOR=22
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.8.5 \
    # futurecoder build expects these; adjust if you want to use production Firebase etc.
    FUTURECODER_LANGUAGE=en \
    REACT_APP_USE_FIREBASE_EMULATORS=1 \
    REACT_APP_FIREBASE_STAGING=1 \
    CI=false

# system deps + Node.js
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg git build-essential; \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -; \
    apt-get install -y --no-install-recommends nodejs; \
    node -v && npm -v; \
    rm -rf /var/lib/apt/lists/*

# Poetry
RUN set -eux; \
    curl -sSL https://install.python-poetry.org | python3 -; \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry; \
    poetry --version

WORKDIR /app

# Install Python deps first (better layer caching)
COPY pyproject.toml poetry.lock ./
RUN set -eux; \
    poetry config virtualenvs.in-project true; \
    poetry install --no-root --no-interaction --no-ansi

# Bring in the rest of the project
COPY . .
RUN chmod +x scripts/*.sh || true

# ✅ Install frontend deps so "craco" exists
RUN npm ci --prefix frontend

# Build the site (show each failing command clearly)
RUN set -eux; \
    poetry --version; \
    poetry install --no-root -v; \
    ./scripts/generate.sh; \
    ./scripts/build.sh

# After build, the static site should be in dist/course
# Validate the build output early (this will fail the build if something’s missing)
# ---------- normalize & validate build output ----------
RUN set -eux; \
    # Base structure must exist
    test -d dist/course; \
    test -f dist/course/index.html; \
    test -d dist/course/pyodide; \
    \
    # Normalize python_stdlib.zip (required by runtime)
    if [ -f dist/course/python_stdlib.zip ]; then \
      echo "Found stdlib at dist/course/python_stdlib.zip"; \
    elif [ -f dist/course/pyodide/python_stdlib.zip ]; then \
      echo "Found stdlib under pyodide/, normalizing to course root..."; \
      cp -f dist/course/pyodide/python_stdlib.zip dist/course/python_stdlib.zip; \
    else \
      echo "python_stdlib.zip missing (looked in course/ and course/pyodide/)"; \
      exit 1; \
    fi; \
    \
    # Optional: normalize python_core tar if the build produced one
    CORE_FILE="$(find dist/course -maxdepth 2 -type f -name 'python_core*.tar' | head -n1 || true)"; \
    if [ -n "$CORE_FILE" ] && [ ! -f dist/course/python_core.tar ]; then \
      echo "Normalizing $CORE_FILE -> dist/course/python_core.tar"; \
      cp -f "$CORE_FILE" dist/course/python_core.tar || true; \
    fi; \
    \
    # Final assertions
    test -f dist/course/python_stdlib.zip


# ---------- runtime stage ----------
FROM nginx:alpine AS runtime

# Nginx serves on 80
EXPOSE 80

# Copy the built site under /usr/share/nginx/html
COPY --from=build /app/dist/course /usr/share/nginx/html/course

# Optional: redirect root to /course/
RUN printf '<!doctype html><meta http-equiv="refresh" content="0; url=/course/">' \
    > /usr/share/nginx/html/index.html

# Minimal nginx config (default works fine for static)
CMD ["nginx", "-g", "daemon off;"]
