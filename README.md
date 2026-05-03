# rigbuilder

## Database Migrations

This project uses **Prisma Migrate** for database schema management.

> ⚠️ **Never use `prisma db push` in production.** It does not track migration history and can cause data loss.

### Development setup

```bash
# Apply all pending migrations
cd backend
npx prisma migrate deploy

# Create a new migration after editing schema.prisma
npx prisma migrate dev --name <describe_your_change>
```

### CI / Production

The CI pipeline runs `npx prisma migrate deploy` automatically against the test database. In production, run the same command as part of your deployment step before starting the server.

### First-time setup

```bash
# 1. Copy the example env file and fill in your values
cp backend/.env.example backend/.env

# 2. Install dependencies
cd backend && npm install

# 3. Apply migrations and generate the Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. (Optional) Seed the database
npx prisma db seed
```
