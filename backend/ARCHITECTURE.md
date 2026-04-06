# Backend Architecture — Controller → Service → Repository

```
backend/src/
├── config/
│   ├── env.ts                  # Validated env vars via Zod
│   ├── cors.ts                 # Origin whitelist
│   ├── helmet.ts               # CSP + security headers
│   └── rate-limit.ts           # Per-route rate limit configs
│
├── middleware/
│   ├── authenticate.ts         # Session validation via Lucia
│   ├── csrf.ts                 # Double-submit CSRF check
│   ├── validate.ts             # Generic Zod validation middleware
│   ├── ownership.ts            # RLS: verify resource belongs to session user
│   ├── sanitize.ts             # DOMPurify pass on UGC fields
│   └── error-handler.ts        # Central async error handler
│
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── product.controller.ts
│   ├── build.controller.ts
│   ├── review.controller.ts
│   └── compatibility.controller.ts
│
├── services/
│   ├── auth.service.ts         # Argon2id hash/verify, session create/destroy
│   ├── user.service.ts
│   ├── product.service.ts
│   ├── build.service.ts
│   ├── review.service.ts
│   └── compatibility.service.ts
│
├── repositories/
│   ├── user.repository.ts
│   ├── product.repository.ts
│   ├── build.repository.ts
│   ├── review.repository.ts
│   └── compatibility.repository.ts
│
├── validators/                 # Zod schemas
│   ├── auth.schema.ts
│   ├── user.schema.ts
│   ├── product.schema.ts
│   ├── build.schema.ts
│   └── review.schema.ts
│
├── routes/
│   ├── index.ts                # Route aggregator
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── product.routes.ts
│   ├── build.routes.ts
│   ├── review.routes.ts
│   └── compatibility.routes.ts
│
├── utils/
│   ├── compatibility-engine.ts # Core spec-conflict checker
│   ├── slug.ts                 # URL-safe slug generation
│   ├── pagination.ts           # Cursor/offset helpers
│   └── logger.ts               # Structured logging (pino)
│
├── types/
│   ├── product-specs.ts        # Per-category spec interfaces
│   ├── compatibility.ts        # Conflict result types
│   └── api.ts                  # Request/Response envelope types
│
├── prisma.ts                   # PrismaClient singleton + middleware
├── lucia.ts                    # Lucia auth config
└── server.ts                   # Express app bootstrap
```
