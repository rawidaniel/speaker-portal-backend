# Csv File Parser Backend

## How to Run the App (Development Mode)

### Prerequisites

- Node.js (v16+ recommended)
- npm
- Docker (for Redis and Postgres)

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
  - Database: `csv_file_parser`

### 5. Start the API Server (Development)

```bash
npx nodemon src/server.ts
```

Or, if you have the script in your `package.json`:

```bash
npm run dev
```

### 6. Start the Worker (Development, in a separate terminal)

```bash
npx nodemon src/worker/csvWorker.ts
```

Or, if you have the script:

```bash
npm run worker:dev
```

### 7. Register or Log In to Get a Token

Before uploading a CSV file, you must register or log in to obtain an authentication token:

- Register: `POST /api/auth/signup`
- Log in: `POST /api/auth/login`

Include the received token as a Bearer token in the Authorization header for subsequent requests.

### 8. Upload a CSV File

- Send a `POST` request to `/api/file/upload` with a CSV file (field name: `file`).
- **Reminder:** Include your authentication token as a Bearer token in the `Authorization` header.
- The response will include a `jobId`, `statusUrl`, and `downloadLink`.

### 9. Poll for Job Status

- Use `GET /api/file/status/:jobId` to check if the job is completed.
- **Reminder:** Include your authentication token as a Bearer token in the `Authorization` header.
- When `state` is `completed`, the file is ready for download at the `downloadLink`.

---

## Algorithm Explanation & Memory Efficiency

### Streaming & Aggregation

- The app uses the `csv-parser` library to **stream** the uploaded CSV file row by row.
- Each row is processed as it arrives, and the total sales per department are aggregated in a JavaScript object (`departmentSales`).
- This approach avoids loading the entire file into memory, making it suitable for very large CSV files.

### Output

- After streaming and aggregation, the results are written to a new CSV file (with a UUID filename) in the `output/` directory.
- The output CSV includes:
  - Two comment lines with processing time and number of departments
  - The aggregated sales data

### Background Processing

- The app uses **BullMQ** and **Redis** to process CSV files in the background.
- The API server enqueues jobs, and a separate worker process handles the heavy processing, keeping the API responsive.

---

## File Structure

```
project-root/
├── src/
│   ├── controllers/
│   │   ├── authController.ts       # Handles user authentication (login, signup)
│   │   ├── errorController.ts      # Global error handling logic
│   │   ├── fileController.ts        # Handles file upload and job enqueue
│   │   └── jobStatusController.ts  # Handles job status queries
│   ├── middlewares/
│   │  ├──  errorHandler.ts         # Catches and processes application errors
│   │   └── catchAsync.ts           # Async error wrapper
│   ├── services/
│   │   └── csvService.ts           # Streaming CSV aggregation logic
│   ├── queue/
│   │   └── csvQueue.ts             # BullMQ queue setup
│   ├── worker/
│   │   └── csvWorker.ts            # BullMQ worker for background jobs
│   ├── routes/
│   │   └── fileRoute.ts            # API routes for file upload/status
│   ├── utils/
│   │   ├── appError.ts             # Custom error class
│   │   └── catchAsync.ts           # Async error wrapper
│   ├── app.ts                      # Express app setup
│   └── server.ts                   # App entry point
├── output/                         # Output CSV files (downloadable)
├── docker-compose.yml              # Redis and Postgres services for BullMQ and database
├── tsconfig.json                   # TypeScript config
└── README.md
```

---

## Code Comments

- Each file and function includes comments explaining its purpose and logic.
- Key points:
  - **Controllers**: Handle HTTP requests, validation, and job management.
  - **Service**: Contains the streaming CSV aggregation logic, with comments on memory efficiency.
  - **Worker**: Listens for jobs and processes them in the background.
  - **Queue**: Sets up BullMQ for job management.
  - **Utils**: Error handling and async wrappers for clean code.
