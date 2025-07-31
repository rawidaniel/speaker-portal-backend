# Csv File Parser Backend

## How to Run the App (Development Mode)

### Prerequisites

- Node.js (v16+ recommended)
- npm
- Docker forPostgres database

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a .env File

- Copy the example environment file:
  ```bash
  cp .env.example .env
  ```
- Edit `.env` to set your credentials and configuration as needed.

### 3. Set Up the Database with Prisma

- Generate the Prisma client:
  ```bash
  npx prisma generate
  ```
- Run database migrations:
  ```bash
  npx prisma migrate dev
  ```
  This will apply all migration files to your Postgres database.

### 4. Start Redis and Postgres (using Docker Compose)

```bash
docker-compose up -d
```

- This will start both Redis (for BullMQ) and Postgres (for database storage).
- **Postgres connection details:**
  - Host: `localhost`
  - Port: `5432`
  - User: `postgres`
  - Password: `postgres`
  - Database: `speaker_portal`

### 5. Start the API Server (Development)

```bash
npx nodemon src/server.ts
```

Or, if you have the script in your `package.json`:

```bash
npm run dev
```

## File Structure

```
project-root/
├── src/
│   ├── controllers/
│   │   ├── authController.ts       # Handles user authentication (login, signup)
│   │   ├── errorController.ts      # Global error handling logic
│   │   ├── eventController.ts      # Handles event creation and tracking
│   │   └── userController.ts       # Handles user profile update and profile image upload
│   ├── middlewares/
│   │  ├──  errorHandler.ts         # Catches and processes application errors
│   │   └── catchAsync.ts           # Async error wrapper
│   ├── routes/
|   |   ├── authRoute.ts            # API routes for authentication
|   |   ├── eventRoute.ts           # API routes for event creation and tracking
|   |   └── userRoute.ts            # API routes for user information update
│   ├── utils/
│   │   ├── appError.ts             # Custom error class
│   │   ├── paginator.ts            # Custom function to paginate the response
│   │   ├── sanitize.ts            # Custom function to exclude properties from the response
│   │   └── catchAsync.ts           # Async error wrapper
│   ├── app.ts                      # Express app setup
│   └── server.ts                   # App entry point
├── public/                         # User profile pictures (downloadable)
├── docker-compose.yml              # Postgres database
├── tsconfig.json                   # TypeScript config
└── README.md
```

---

## Code Comments

- Each file and function includes comments explaining its purpose and logic.
- Key points:
  - **Controllers**: Handle HTTP requests, validation, and job management.
  - **Routes**: Contains all the API route definitions, mapping HTTP endpoints to their corresponding controller functions for authentication, event management, and user operations.
  - **Utils**: Error handling and async wrappers for clean code.
