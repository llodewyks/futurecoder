# ---------- BUILD STAGE ----------
FROM node:22-bullseye AS build
WORKDIR /app

# Python + curl for the project scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy repo
COPY . .

# Frontend deps (craco etc.)
RUN npm --prefix frontend ci

# Poetry for the Python bits
RUN curl -sSL https://install.python-poetry.org | python3 - \
 && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /root/.bashrc
ENV PATH="/root/.local/bin:${PATH}"

# Generate translations/static files and build the site
RUN poetry --version \
 && poetry install --no-root \
 && ./scripts/generate.sh \
 && ./scripts/build.sh

# Normalize Pyodide artifacts so the app (and our server) can fetch them deterministically
# - Ensure python_stdlib.zip is at /course/
# - Ensure python_core.tar is at /course/ (download the official core tar if not produced)
RUN bash -e <<'BASH'
OUT="dist/course"
test -d "$OUT" && test -f "$OUT/index.html"

# stdlib to root
if [ -f "$OUT/pyodide/python_stdlib.zip" ] && [ ! -f "$OUT/python_stdlib.zip" ]; then
  cp "$OUT/pyodide/python_stdlib.zip" "$OUT/python_stdlib.zip"
fi
test -f "$OUT/python_stdlib.zip"

# core tar to root (download official core if missing)
if [ ! -f "$OUT/python_core.tar" ]; then
  VER=$(node -p "require('./${OUT}/pyodide/package.json').version")
  echo "Pyodide version: $VER"
  for U in \
    "https://cdn.jsdelivr.net/pyodide/v${VER}/full/pyodide-core-${VER}.tar.bz2" \
    "https://repo.pyodide.org/pyodide/v${VER}/full/pyodide-core-${VER}.tar.bz2" \
    "https://github.com/pyodide/pyodide/releases/download/${VER}/pyodide-core-${VER}.tar.bz2?download=1" ; do
    echo "Trying $U"
    if curl -LfsS "$U" -o "$OUT/python_core.tar"; then
      break
    fi
  done
fi

# Sanity: non-empty + starts with BZh (bzip2)
test -s "$OUT/python_core.tar"
head -c 3 "$OUT/python_core.tar" | grep -q 'BZh'
BASH


# ---------- RUNTIME STAGE ----------
FROM nginx:1.27-alpine
# Extra MIME types for Pyodide bits
RUN printf "\n  types {\n    application/wasm wasm;\n    application/octet-stream whl data;\n    application/x-bzip2 bz2 bz;\n  }\n" >> /etc/nginx/mime.types

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static site goes under /usr/share/nginx/html/course
COPY --from=build /app/dist/course /usr/share/nginx/html/course

# Health check (optional)
RUN echo "ok" > /usr/share/nginx/html/healthz

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
