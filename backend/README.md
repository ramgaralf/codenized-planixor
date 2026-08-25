# Codenized.Planixor — Backend API

.NET 10 REST API with Clean Architecture (5 tiers, 11 projects).

## Build

```bash
dotnet build Codenized.Planixor.slnx
```

## Test

```bash
dotnet test Codenized.Planixor.slnx
```

## Run

```bash
dotnet run --project src/Codenized.Planixor.Api
```

## Docker

```bash
docker compose up --build
```

## Observability

Logs, traces and metrics over OpenTelemetry via `Codenized.OpenTelemetry.Logger`, exportable to Honeycomb (or any OTLP-compatible backend). See `TelemetrySettings` in `appsettings.json` and the `Codenized.OpenTelemetry.Logger` section of `.kiro/steering/backend-tech.md` for the full configuration reference.

## Solution Structure

| Tier | Folder | Projects |
|---|---|---|
| 1 — Enterprise Business Rules | `src/Codenized.Planixor.Core` | Core |
| 2 — Application Business Rules | `src/Codenized.Planixor.{Dtos,Events,UseCases}` | Dtos, Events, UseCases |
| 3 — Interface Adapters | `src/Codenized.Planixor.{Services,Persistence.*}` | Services, DataContext, Repositories, Persistence.IoC |
| 4 — Frameworks and Drivers | `src/Codenized.Planixor.{IoC,Api}` | IoC, Api |
| 5 — Tests | `src/UnitTest.Codenized.Planixor` | UnitTest |
