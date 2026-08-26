# Frontend Application

The frontend is a browser-based Single Page Application (SPA) built with **React** and **Vite**, providing an intuitive interface for students, professionals, and volunteers to discover mentors, manage learning sessions, and exchange skills.

## Architectural Overview

- **Framework**: React 18+ with Vite for fast build tooling and hot module replacement (HMR).
- **Communication**: Interacts with the backend exclusively via standard REST APIs (JSON over HTTPS).
- **Authentication**: Stores JSON Web Tokens (JWT) client-side and includes them in the `Authorization: Bearer <token>` header for all authenticated requests.

## Application Views & Routing

- **Home / Dashboard**: Central dashboard displaying active sessions, upcoming bookings, and learning milestones.
- **Mentor Search**: Search and filter interface for discovering mentors based on skill keywords, level, and availability.
- **Recommendations Feed**: Personalized feed of recommended mentors ranked by algorithmic affinity scores.
- **Session Booking**: Scheduling interface to request and manage 1:1 or group learning sessions.
- **Learning History**: Timeline tracking completed sessions, hours logged, and peer feedback.
- **Skill Profile**: Profile editor where users manage skills they teach and skills they wish to learn.
- **Authentication**: Clean login and registration pages with role selection (Student, Professional, Volunteer).

## Project Structure

```
frontend/
├── src/
│   ├── assets/        # Static assets, icons, and styling themes
│   ├── components/    # Reusable UI components (Navbar, Cards, Modals, Forms)
│   ├── context/       # React Context providers (AuthContext, SessionContext)
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components corresponding to application routes
│   ├── services/      # API client and service layer for backend communication
│   ├── utils/         # Helper functions and formatting utilities
│   ├── App.jsx        # Root application component and router configuration
│   └── main.jsx       # Application entry point
├── package.json       # Frontend dependencies and scripts
└── vite.config.js     # Vite build configuration
```

## System Architecture Reference

For full architectural diagrams, request lifecycles, and backend API contracts, refer to the [System Architecture Documentation](../docs/ARCHITECTURE.md).
