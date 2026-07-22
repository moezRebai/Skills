# Stack detection

Identify what a repo *is* before reading any logic. Detection is signal-based:
look for manifest files, config, and directory conventions. Never assume — a
`.py` file next to a `pom.xml` may be tooling, not the main app.

## Table of contents
- Step 1: Language mix
- Step 2: Package manager & manifests
- Step 3: Frameworks & runtime
- Step 4: Build, test, CI
- Step 5: Infra, data, messaging
- Step 6: Entry points
- Resolving ambiguity

## Step 1 — Language mix
Count files by extension (excluding vendored/generated dirs). The dominant few
languages define the primary strategy; minor ones are usually build glue, IaC,
or scripts. Note polyglot repos explicitly.

## Step 2 — Package manager & manifests
Presence of a manifest is the strongest stack signal:

| Ecosystem | Manifest / lockfile signals |
|-----------|-----------------------------|
| Node/JS/TS | `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `tsconfig.json` |
| Python | `pyproject.toml`, `requirements*.txt`, `setup.py`, `Pipfile`, `poetry.lock` |
| Java/Kotlin | `pom.xml`, `build.gradle(.kts)`, `settings.gradle` |
| .NET/C# | `*.sln`, `*.csproj`, `*.fsproj`, `Directory.Build.props` |
| Go | `go.mod`, `go.sum` |
| Rust | `Cargo.toml`, `Cargo.lock` |
| Ruby | `Gemfile`, `*.gemspec` |
| PHP | `composer.json` |
| Swift | `Package.swift`, `*.xcodeproj` |
| Elixir | `mix.exs` |
| C/C++ | `CMakeLists.txt`, `Makefile`, `conanfile` |

Read the manifest's dependency list — it reveals frameworks, datastores, and
messaging libs without reading source.

## Step 3 — Frameworks & runtime
Infer from dependencies + directory conventions. Examples of tells:
- Web/API: express/fastify/nest, django/flask/fastapi, spring-boot, asp.net,
  gin/echo, rails, laravel, actix/axum.
- Frontend: react/vue/svelte/angular, next/nuxt, vite/webpack config.
- Async/reactive: rxjs/reactor/rx.net, akka, celery, sidekiq, message-loop code.
- Runtime hints: `Dockerfile`, `.nvmrc`, `runtime.txt`, target framework in
  csproj, JVM version in gradle, `go` directive version.

## Step 4 — Build, test, CI
- Build/task runners: npm scripts, make, gradle/maven goals, cargo, nx/turbo,
  bazel.
- Test frameworks: jest/vitest, pytest, junit, xunit/nunit, go test, rspec.
  Locate the test dir — tests are the best executable spec of intended behavior.
- CI: `.github/workflows`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`
  — reveals build/deploy topology and environments.

## Step 5 — Infra, data, messaging
- Datastores: ORM/driver deps + migration dirs (`migrations/`, `*.sql`, prisma
  schema, ef migrations, flyway/liquibase).
- Messaging/streaming: kafka, rabbitmq, nats, sqs/sns, pubsub, grpc/protobuf.
- Infra-as-code: terraform, pulumi, helm, k8s manifests, `docker-compose.yml`.
- Observability: prometheus, opentelemetry, logging config.
- Config surfaces: `.env*`, `appsettings*.json`, `config/`, consul/vault refs.

## Step 6 — Entry points
Find where execution begins — this anchors every deep-dive flow:
- `main`/`Main`/`__main__`, server bootstrap files, `index.*` at root of an app.
- HTTP route registrations, CLI command definitions, cron/queue/worker
  registrations, serverless handler exports, scheduled jobs.

## Resolving ambiguity
- Multiple manifests → likely a monorepo or polyglot service; map each package
  as a component and note the boundary.
- Manifest present but few source files → could be a template/scaffold; say so.
- Generated code (protobuf stubs, ORM artifacts) → identify and exclude from
  "authored" analysis, but note it in the technical docs.
- When two signals conflict, prefer the manifest + entry points over directory
  names, and record the ambiguity as an open question rather than guessing.
