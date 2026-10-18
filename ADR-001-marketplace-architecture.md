# ADR-001: Kilo Code Marketplace architecture

- **Status:** Accepted
- **Date:** 2026-10-17
- **Decider:** Moez (ePricing squad lead, AI Guild)

## Context

The TeamFlow plugin (router agent + `tf-*` skills) is published manually with `npm publish` to the internal Artifactory npm registry, from a Bitbucket repository. Users run `install.bat`, which logs in to Artifactory and installs everything globally into Kilo Code (`%USERPROFILE%\.kilocode\`).

We want a marketplace web app where users can browse skills, agents and plugins, read their content, and install them either automatically or by downloading a zip and placing it in their Kilo Code folder themselves. We also want usage statistics.

## Decisions

### 1. Distribution channel: the marketplace server, not Artifactory

Skills and plugins are served directly by the marketplace server. Access control relies on Windows authentication (Kerberos) restricted to an AD group, so users never type credentials. `install.bat` downloads from the same server using the user's Windows identity (`Invoke-WebRequest -UseDefaultCredentials`).

Users only need network access (HTTPS) to the server and membership of the AD group. They need no account or rights on the server itself.

### 2. Stack: ASP.NET Core minimal API on IIS, static front end

One project, one deployment:

```
Marketplace/
├── Program.cs          ← endpoints + Windows authentication
├── appsettings.json    ← packages folder path, AD groups
└── wwwroot/
    ├── index.html      ← the marketplace page
    ├── app.js          ← catalogue, selection, Markdown viewer
    └── natixis.css     ← tokens from the natixis-frontend skill
```

- **.NET 10 (LTS)**, hosted on IIS with the ASP.NET Core Module and Windows authentication enabled.
- **Front end:** plain HTML, CSS and JavaScript, no framework and no build step. No CDN dependencies: all assets (including the chart library) are served from `wwwroot` so the site works on the internal network.
- **Blazor is explicitly ruled out**: Blazor Server needs a permanent WebSocket per user through IIS, and Blazor WASM downloads several MB to display a catalogue.

### 3. Backend endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/catalog` | Catalogue of the latest published version |
| `GET /api/skills/{id}/files/{**path}` | Skill files for the Markdown viewer |
| `GET /api/download/{id}.zip` | Zip generated on the fly, dependencies included |
| `GET /api/install.bat?items=...` | Installer for the user's selection |
| `POST /api/events` | Install confirmation sent by `install.bat` |
| `GET /api/stats` | Aggregated statistics (admin AD group only) |

Packages are read from a server folder (e.g. `D:\marketplace\packages\<version>\`). Each publish drops a new version there, alongside a `catalog.json` generated at publish time from the `SKILL.md` frontmatter. The site always shows the latest version without redeployment.

### 4. Catalogue model

- **Skills** are listed individually, before plugins.
- **TeamFlow is a single plugin** containing the router agent and its `tf-*` skills. The `tf-*` skills are not offered individually because they only work through the router.
- Each skill folder name must match its `name` field, as Kilo Code requires.

### 5. Statistics storage: SQLite

Statistics are stored in a SQLite database, accessed with Dapper and `Microsoft.Data.Sqlite`.

- One `Events` table: timestamp, user, item, version, type (`zip`, `install`, `update`, `view`).
- The database file lives outside the application folder (e.g. `D:\marketplace\data\stats.db`) so redeployments never overwrite it.
- The IIS application pool identity has write access to the whole data folder (SQLite creates temporary files next to the database).
- WAL mode is enabled at startup (`PRAGMA journal_mode=WAL`) so stats reads do not block event writes.
- Backup: a scheduled task runs `VACUUM INTO` to another location.

## Consequences

**Positive**
- Smooth user experience: no credential prompt, one command or one zip.
- Single, small codebase in the team's main technology (.NET).
- No database server to request or operate.
- Publishing stays a file drop; the site updates itself.

**Negative / constraints**
- The marketplace becomes a distribution channel next to Artifactory; to be confirmed with Security that this is acceptable.
- SQLite limits the app to **one server instance**. Moving to several instances behind a load balancer requires migrating statistics to SQL Server.
- Statistics show downloads and installs, not actual skill usage inside Kilo Code.
- Storing user identities in statistics is personal data processing; to be validated with Compliance / DPO. Mitigation: store a hashed identifier only and purge detailed events after a few months.

## Open points

- Network flow opening to the server (HTTPS 443) and internal DNS name + PKI certificate.
- AD groups: users, and admins for the stats page.
- Contribution process for new skills (pull request on Bitbucket, AI Guild review).
- Final name of the marketplace.
