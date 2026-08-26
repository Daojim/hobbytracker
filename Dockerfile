# syntax=docker/dockerfile:1

# HobbyTracker, as two images built from one file.
#
#   docker build --target api -t hobbytracker-api .
#   docker build --target web -t hobbytracker-web .
#
# Two rather than one because production mirrors development: in development Vite serves the SPA
# and proxies /api to the API, and here Caddy serves the built SPA and proxies /api to Kestrel.
# The browser sees one origin either way, which is the property the whole session design rests
# on -- an httpOnly SameSite=Lax cookie, and no CORS policy anywhere in the codebase.
#
# The build context is the repository root. See .dockerignore, which is what keeps a Windows
# bin/ and a 300 MB node_modules out of it.

# ------------------------------------------------------------------ the frontend
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /src/frontend

# The lockfile on its own first, so editing a component does not reinstall node_modules. `npm ci`
# rather than `npm install`: it installs exactly what the lockfile pins and fails instead of
# quietly rewriting it, which is the difference between a reproducible image and a lucky one.
#
# Three dependencies here ship native binaries -- @rolldown/binding, @tailwindcss/oxide and
# lightningcss. The lockfile records every platform's variant, including linux-x64-gnu, so this
# resolves on Linux from a lockfile written on Windows. Checked rather than assumed.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ----------------------------------------------------------------------- the API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src

# The same shape, for the same reason: project file and package versions first, so restore stays
# cached until a dependency really changes. Directory.Packages.props is not optional -- every
# PackageReference in the csproj is deliberately bare of a Version, so a restore that cannot see
# this file resolves nothing at all.
COPY backend/Directory.Packages.props backend/
COPY backend/src/HobbyTracker.Api/HobbyTracker.Api.csproj backend/src/HobbyTracker.Api/
RUN dotnet restore backend/src/HobbyTracker.Api/HobbyTracker.Api.csproj

COPY backend/src/ backend/src/
RUN dotnet publish backend/src/HobbyTracker.Api/HobbyTracker.Api.csproj \
        --configuration Release --no-restore --output /app

# ------------------------------------------------------------------ what runs it
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS api

# Npgsql probes for Kerberos on its way to the first connection, and the runtime image carries no
# krb5. The probe is harmless -- password authentication is what is configured, and it works --
# but without this the first lines of every deployment log are "Cannot load library
# libgssapi_krb5.so.2" and a bare "Error:", which is exactly how a real failure later gets skimmed
# past. Installed before USER below, because apt needs root.
RUN apt-get update \
        && apt-get install --yes --no-install-recommends libgssapi-krb5-2 \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=api-build /app ./

# The image's own non-root user. Compose overrides it to match whoever owns the bind-mounted key
# ring on the host -- see deploy/compose.yml, and note that losing write access there is not an
# error but a session that silently stops surviving restarts.
USER $APP_UID

# The image's default, stated because the Caddyfile proxies to it by number.
EXPOSE 8080

ENTRYPOINT ["dotnet", "HobbyTracker.Api.dll"]

# ------------------------------------------------------------- what serves the SPA
FROM caddy:2-alpine AS web

COPY --from=frontend-build /src/frontend/dist /srv

# Baked in rather than bind-mounted. It is source, it belongs to this commit, and a copy sitting
# on a server is a copy that can drift from the repository without anything saying so.
COPY deploy/Caddyfile /etc/caddy/Caddyfile
