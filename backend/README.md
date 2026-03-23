# Stock Management Backend

## Structure

```
backend/
├── src/
│   ├── config/              # Configuration
│   │   ├── database.js      # MySQL connection pool
│   │   └── constants.js     # App constants
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── tenancy.js       # Multi-tenant context
│   │   ├── permissions.js   # RBAC permission checking
│   │   ├── validation.js    # Request validation
│   │   └── errorHandler.js  # Global error handler
│   │
│   ├── models/              # Data access layer
│   │   ├── User.js
│   │   └── Company.js
│   │
│   ├── services/            # Business logic layer
│   │   ├── auth.service.js
│   │   └── company.service.js
│   │
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   └── company.controller.js
│   │
│   ├── routes/              # Route definitions
│   │   ├── auth.routes.js
│   │   ├── company.routes.js
│   │   └── index.js
│   │
│   ├── utils/               # Helper functions
│   │   ├── asyncHandler.js
│   │   └── jwt.js
│   │
│   └── app.js               # Express app setup
│
├── tests/                   # Test files
├── .env                     # Environment variables
├── package.json
└── index.js                 # Entry point
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=stock
   API_PORT=5000
   JWT_SECRET=your_secret_key
   ```

3. **Run the server:**
   ```bash
   npm run dev    # Development with nodemon
   npm start      # Production
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/login` - Login user

### Companies
- `GET /api/companies` - List companies (requires auth)
- `GET /api/companies/:id` - Get company by ID (requires auth)

### Health Check
- `GET /api/health` - Server health check

## Middleware

### Authentication
```javascript
const { auth } = require('./src/middleware/auth');
router.get('/protected', auth, controller);
```

### Multi-Tenancy
```javascript
const { tenancy } = require('./src/middleware/tenancy');
router.get('/data', auth, tenancy, controller);
```

### Permissions
```javascript
const { permissions } = require('./src/middleware/permissions');
router.get('/products', auth, tenancy, permissions('products.view'), controller);
```

## Migration Status

See `MIGRATION_STATUS.md` for detailed migration progress.

## Architecture

- **Models**: Database queries only
- **Services**: Business logic
- **Controllers**: Request/response handling (thin layer)
- **Routes**: URL mapping + middleware
- **Middleware**: Cross-cutting concerns (auth, permissions, validation)

