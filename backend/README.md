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

## System Architecture Reference

For detailed sequence diagrams, database entity relationships, and the complete REST API specification, see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
