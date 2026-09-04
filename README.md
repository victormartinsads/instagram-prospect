# Autonomous Instagram Prospecting System

A fully automated AI sales agent for Instagram built for "Mart Digital".

## Overview

This system operates an end-to-end prospecting cycle on Instagram:
1. **Discover**: Finds leads based on ICP keywords
2. **Score & Qualify**: Uses OpenAI to read profiles and qualify B2B prospects
3. **Contact**: Initiates the conversation via Chrome CDP (bypassing Meta API limitations)
4. **Converse**: Uses an AI engine to classify intents and decide next actions (answering questions, handling objections)
5. **Handoff**: Pushes qualified, interested leads to WhatsApp or flags them for human intervention.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Database**: SQLite (via `@libsql/client` and `better-sqlite3` types) + Drizzle ORM
- **Automation**: Playwright (connectOverCDP)
- **AI**: OpenAI API (gpt-4o, gpt-4o-mini)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Worker**: Node.js background process (concurrently with Next.js)

## Architecture

The system uses a unified SQLite database (`prospector.db`) in WAL mode, allowing concurrent reads/writes from both the Next.js web server and the background worker.

### The Hybrid Channel Strategy
Meta's Graph API for Instagram does not allow businesses to initiate conversations with arbitrary users. To solve this, the system uses a hybrid approach:
1. **Browser Channel**: Playwright connects to a dedicated Chrome profile to send the *first message*.
2. **API Channel**: Once the lead replies, the system handles the Webhook and shifts the conversation to the official Meta API for a stable, high-performance chat loop during the 24-hour messaging window.

## Project Structure

- `src/app`: Next.js frontend (PT-BR UI)
- `src/db`: SQLite schema, connection, and queries
- `src/lib`: Core domain logic (types, errors, rate limits, circuit breakers)
- `src/integrations`: Connectors for OpenAI, Browser, and IG API
- `src/worker`: Background job runner, scheduler, and job definitions
- `src/features`: Server Actions and queries grouping domain features (leads, campaigns, experiments)

## Developer Guide

See `SETUP.md` for local installation and running instructions.

### Tests
Core business logic and database queries are tested using Vitest with an in-memory database:
```bash
npx vitest run
```

### Type Checking & Linting
```bash
pnpm tsc --noEmit
pnpm lint
```
