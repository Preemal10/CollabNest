# CollabNest

A real-time collaborative project management tool with Kanban boards, task management, and team collaboration features.

## Features

- **Kanban Boards** - Drag-and-drop task management with customizable columns
- **Real-time Collaboration** - Live updates across all team members via WebSocket
- **Team Management** - Organizations, projects, and role-based access control
- **Task Management** - Priorities, due dates, labels, checklists, and assignees
- **Comments & Attachments** - Discuss tasks and share files
- **Activity Feed** - Track all changes and updates
- **Notifications** - Stay informed about task assignments and mentions

## Tech Stack

- **Frontend**: React 18, TypeScript, Redux Toolkit, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB
- **Cache**: Redis
- **Real-time**: Socket.io
- **Auth**: JWT + Google OAuth
- **Testing**: Jest, Cypress, Vitest, Playwright

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
npm install
npm run build:shared
```

### 2. Start Database Services

```bash
npm run docker:up
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Start Development

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm run build` | Build all packages |
| `npm run test` | Run Vitest unit tests |
| `npm run test:jest` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run cypress` | Open Cypress test runner |
| `npm run cypress:run` | Run Cypress E2E tests |
| `npm run lint` | Lint code |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |

## Environment Variables

Key configuration options (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## License

MIT
