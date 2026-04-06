# RigBuilder — Security Manifest

## 1. Authentication & Session Management
- **Password hashing**: Argon2id (memory: 64MB, iterations: 3, parallelism: 4)
- **Sessions**: Lucia Auth with PostgreSQL session store; HttpOnly, Secure, SameSite=Lax cookies
- **CSRF**: Double-submit cookie pattern; all state-mutating routes require valid CSRF token
- **Account lockout**: 5 failed attempts → 15-minute progressive lockout per IP + account

## 2. Input Validation & Sanitization
- **Every** API route validates request body/params/query via Zod schemas before touching business logic
- User-generated HTML content (reviews, build stories) sanitized with DOMPurify server-side
- SQL injection prevented at ORM layer (Prisma parameterised queries) + Zod type coercion
- File uploads: allowlisted MIME types, max 5MB, stripped EXIF metadata

## 3. Rate Limiting
- Auth routes (`/auth/*`): 5 req/min per IP (express-rate-limit) + express-slow-down (500ms delay after 3)
- Search routes: 30 req/min per IP
- Write routes (reviews, builds): 10 req/min per authenticated user
- Global fallback: 100 req/min per IP

## 4. Data Integrity & Authorization
- Row-Level Security enforced via Prisma middleware: all UPDATE/DELETE ops verified against `session.userId`
- Builds, reviews, and profiles are strictly user-scoped — no cross-user mutation possible
- Soft deletes for user content; hard deletes only via admin with audit log

## 5. Transport & Headers
- Helmet.js with strict CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src 'self' data: blob:; font-src fonts.gstatic.com; connect-src 'self'`
- CORS: origin whitelist (production domain + localhost in dev only)
- HSTS, X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin

## 6. Secrets & Configuration
- All secrets via environment variables, never committed
- `.env` in `.gitignore`; `.env.example` provided with placeholder values
- Database connection string uses SSL in production

## 7. Dependency Hygiene
- `npm audit` integrated into CI
- No wildcard (`*`) dependency versions
- Lock files committed
