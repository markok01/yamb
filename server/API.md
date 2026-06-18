# Backend API (Faza 2)

Svi endpointi (osim guest auth) zahtevaju header:

```
x-user-id: <uuid>
```

## Auth

```http
POST /api/auth/guest
Content-Type: application/json

{ "displayName": "Marko" }
```

## Partija

```http
POST /api/games                          # { "diceMode": "VIRTUAL" | "PHYSICAL" }
POST /api/games/join                     # { "roomCode": "ABC123" }
GET  /api/games/:id                      # Detalji + scorecard
GET  /api/games/:id/state                # Isto
POST /api/games/:id/start                # Start (host, min 2 igrača)
GET  /api/games/:id/leaderboard          # Rang lista
```

## Potez

```http
POST  /api/games/:id/turns/start         # { "columnType": "REDOVNA" }
POST  /api/games/:id/turns/najava        # { "rowKey": "KENTA" }
POST  /api/games/:id/turns/roll
PATCH /api/games/:id/turns/hold          # { "index": 0 }
POST  /api/games/:id/turns/submit         # Virtuelne kockice
POST  /api/games/:id/turns/submit-physical # Fizičke kockice { rowKey, score, dice? }
GET   /api/games/:id/stream               # SSE real-time
GET   /api/stats                          # Statistika igrača
```

## Setup baze

```bash
cp .env.example .env
# Uredi DATABASE_URL

mysql -u root -p < server/db/migrations/001_initial.sql
# Postojeća baza:
mysql -u root -p < server/db/migrations/002_dice_mode_stats.sql
# ili: npm run db:push
```
