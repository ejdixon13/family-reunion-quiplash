# Documentation

## Guides

| Guide | Description |
|-------|-------------|
| [SSH Keys](./ssh-keys.md) | What SSH keys are and how to set them up |
| [Deployment Walkthrough](./deployment-walkthrough.md) | Step-by-step deployment to Digital Ocean |
| [Deployment Reference](./deployment-reference.md) | Quick reference for deployment options |

## Quick Start

1. **New to SSH?** Start with [SSH Keys](./ssh-keys.md)
2. **Ready to deploy?** Follow the [Deployment Walkthrough](./deployment-walkthrough.md)
3. **Need a quick reference?** See [Deployment Reference](./deployment-reference.md)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Digital Ocean Droplet                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                      nginx                          │ │
│  │                   (port 80/443)                     │ │
│  └──────────────┬─────────────────────┬───────────────┘ │
│                 │                     │                  │
│                 ▼                     ▼                  │
│  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │       Next.js        │  │       PartyKit         │   │
│  │     (port 3000)      │  │      (port 1999)       │   │
│  │                      │  │                        │   │
│  │  - Home page         │  │  - WebSocket server    │   │
│  │  - Host display      │  │  - Game state          │   │
│  │  - Player interface  │  │  - Real-time sync      │   │
│  └──────────────────────┘  └────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Game Flow

```
1. Host opens http://YOUR_IP → Creates game → Shows QR code
2. Players scan QR → Join on their phones
3. Host selects categories → Starts game
4. Players answer prompts (60 seconds)
5. Everyone votes on answers (20 seconds per matchup)
6. "Behind the Joke" context revealed
7. Scores tallied → Next round
8. Final scores → Winner announced
```
