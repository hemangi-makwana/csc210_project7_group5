# Backend Service & DSA Engine

The backend is a high-performance **Node.js** and **Express** service responsible for API routing, user authentication, role-based authorization, and the core algorithmic engine that powers skill matching and mentor recommendations.

## Architectural Overview

The backend is structured into two logical modules:

```
┌─────────────────────────────────────────────────────────────┐
│                    Auth & API Gateway                       │
│  - JWT Authentication & Verification                        │
│  - Role-Based Access Control (RBAC)                         │
│  - Request Input Validation & Route Dispatch                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        DSA Engine                           │
│  - Hash Table (O(1) Skill / Profile Indexing)               │
│  - Graph + BFS/DFS (Mentor Network Discovery)               │
│  - Max-Heap (Priority Queue Recommendation Ranking)         │
│  - FIFO Queue (Session Booking Request Pipeline)            │
│  - Custom Sorting & Searching (Multi-criteria Filtering)    │
└─────────────────────────────────────────────────────────────┘
```

### 1. Auth & API Gateway
- **Authentication**: Issues and verifies JSON Web Tokens (JWT), with secure password hashing using bcrypt.
- **Role-Based Access Control**: Enforces granular permissions for Students, Professionals, and Volunteers.
- **Route Handlers**: Validates incoming request payloads and coordinates operations with the DSA Engine and persistence layers.

### 2. DSA Engine (Algorithmic Core)
- **Hash Table**: Provides $O(1)$ average-case lookup of user profiles and skill indexes.
- **Graph (Adjacency List) + BFS/DFS**: Models user social and peer connections, enabling mentor discovery across network degrees.
- **Max-Heap (Priority Queue)**: Computes composite match scores and extracts top-$k$ mentor recommendations.
- **FIFO Queue**: Manages session booking queues chronologically to prevent scheduling collisions.
- **Sorting & Searching**: Executes optimized multi-field sorting and filtering for search queries.

## Project Structure

```
backend/
├── src/
│   ├── config/        # Environment and database configuration
│   ├── controllers/   # Route controllers handling request/response logic
│   ├── dsa/           # Academic DSA implementations (HashTable, Graph, Heap, Queue)
│   ├── middleware/    # Auth, validation, and error-handling middleware
│   ├── models/        # Database schemas and data access objects
│   ├── routes/        # Express API route declarations
│   ├── services/      # Business logic orchestrating DSA engine and database operations
│   └── index.js       # Server initialization and Express application entry point
├── package.json       # Backend dependencies and scripts
└── README.md          # Module overview
```

## Local PostgreSQL Database Setup

The backend connects directly to a standard local PostgreSQL database instance for development:

1. **Install & Start PostgreSQL Locally**:
   - Ensure PostgreSQL is running locally on port `5432`.
   - Create a local database named `skill_exchange`:
     ```sql
     CREATE DATABASE skill_exchange;
     ```
2. **Environment Configuration**:
   - Copy `.env.example` to `.env` in the `backend/` directory:
     ```bash
     cp .env.example .env
     ```
   - Update `PGUSER`, `PGPASSWORD`, and `PGDATABASE` with your local PostgreSQL credentials. (Note: `.env` is ignored by git and never committed).
3. **Initialize Schema & Seed Data**:
   - Apply the database schema:
     ```bash
     npm run db:setup
     ```
   - Seed the 20 initial mentors and skills:
     ```bash
     npm run db:seed
     ```
4. **Health Check Endpoint**:
   - Verify connection status at `GET /api/health/db`.

## Messaging, Private Attachments, Voice Notes & Live WebRTC Calls

- **Private Attachments & Voice Notes**:
  - Uploaded files (`POST /api/conversations/:id/attachments`) are validated on the server using magic-byte signatures (`backend/utils/fileValidation.js`), MIME/extension category checks, and size limits (15 MB for PDF/DOCX/XLSX/PNG/JPG/WebP/GIF attachments; 10 MB / 5 minutes for voice notes).
  - Files are stored privately under `backend/uploads/attachments/` (never exposed via `express.static`) and served exclusively through `GET /api/conversations/:convId/attachments/:messageId` after verifying that the authenticated caller is one of the two conversation participants (`403 Forbidden` for any non-participant).
  - The attachment streaming route supports HTTP Range requests (`206 Partial Content`, `Accept-Ranges: bytes`, `Content-Length`) for HTML5 `<audio>` duration display and seeking.
- **WebRTC Audio/Video Calls & TURN Configuration (`GET /api/calls/ice-servers`)**:
  - Calls work out-of-the-box on `localhost` and standard NATs using default STUN servers (`stun:stun.l.google.com:19302`).
  - Outside `localhost`, browsers require **HTTPS** for `navigator.mediaDevices.getUserMedia` and `getDisplayMedia`.
  - For connections across symmetric NATs or restrictive corporate/campus firewalls, configure a self-hosted TURN relay (such as `coturn`) in `backend/.env` without hardcoding credentials in source code:
    ```env
    STUN_SERVER_URL=stun:stun.l.google.com:19302
    TURN_SERVER_URL=turn:your-turn-host.example.com:3478
    TURN_USERNAME=your_turn_username
    TURN_CREDENTIAL=your_turn_credential
    ```

## System Architecture Reference

For detailed sequence diagrams, database entity relationships, and the complete REST API specification, see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
