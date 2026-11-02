# ============================================================
# Bashar News Agency — Production Dockerfile (multi-stage build)
# ============================================================
# همان الگوی monafaseh/Dockerfile — سازگار با deploy.sh ودا:
#   1. deps    — نصب وابستگی‌های قفل‌شده با npm ci
#   2. builder — build کردن Next.js standalone + Prisma client
#   3. runner  — اجرای Next.js standalone با Node 22 (غیر root)
#   4. migrator — یک‌بار prisma db push روی volume دیتابیس
#
# تصویر نهایی بر پایه node:22-bookworm-slim است.
# نکته: alpine نمی‌شود چون باینری native کتابخانه @libsql فقط با glibc
# سازگار است و روی musl خطای fcntl64 می‌دهد.
# ============================================================

# ─── Stage 1: deps ────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

# شبکه‌های پرنوسان: retry/timeout قوی برای npm
ENV npm_config_fetch_retries=10
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_fetch_timeout=600000

WORKDIR /app

# کپی manifest و lockfile برای cache بهتر
COPY package.json package-lock.json ./

# postinstall (= prisma generate) به schema نیاز دارد
COPY prisma/schema.prisma ./prisma/schema.prisma

# نصب نسخه‌های دقیق ثبت‌شده در package-lock.json
RUN npm ci --no-audit --no-fund

# ─── Stage 2: builder ─────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

# Prisma برای تشخیص درست نسخه openssl به CLI آن نیاز دارد؛
# بدون این، روی موتور openssl-1.1.x می‌افتد که در bookworm اجرا نمی‌شود.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# کپی node_modules از stage deps
COPY --from=deps /app/node_modules ./node_modules

# کپی کد منبع
COPY . .

# متغیرهای محیطی برای build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/db/custom.db"

# تولید Prisma client
RUN npx prisma generate

# وابستگی‌های ترانزیتی Prisma CLI برای اجرای db push در image نهایی
RUN mkdir -p /app/prisma-cli-deps/node_modules/@standard-schema && \
    for package in c12 chokidar citty confbox consola deepmerge-ts defu destr dotenv effect empathic exsolve fast-check giget jiti node-fetch-native nypm ohash pathe perfect-debounce pkg-types pure-rand rc9 readdirp tinyexec; do \
      cp -a "/app/node_modules/$package" /app/prisma-cli-deps/node_modules/; \
    done && \
    cp -a /app/node_modules/@standard-schema/spec /app/prisma-cli-deps/node_modules/@standard-schema/

# build کردن Next.js — اسکریپت build خودش static و public را داخل standalone کپی می‌کند
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# کتابخانه openssl برای موتور query پرایسما در زمان اجرا —
# مستقیم از builder کپی می‌شود تا به apt و شبکه وابسته نباشیم
COPY --from=builder /usr/lib/x86_64-linux-gnu/libssl.so.3* /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libcrypto.so.3* /usr/lib/x86_64-linux-gnu/

WORKDIR /app

# متغیرهای محیطی
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/db/custom.db"

# ایجاد کاربر غیر-root برای امنیت
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone شامل static و public هم هست (کپی‌شده در مرحله build)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

# ایجاد پوشه‌ی دیتابیس و uploads با ownership درست
RUN mkdir -p /app/db /app/public/uploads && \
    chown nextjs:nodejs /app/db /app/public/uploads

# Volume برای persistence دیتابیس و uploads
VOLUME ["/app/db", "/app/public/uploads"]

# تغییر به کاربر غیر-root
USER nextjs

# پورت
EXPOSE 3000

# Health check — bootstrap همیشه JSON برمی‌گرداند و دیتابیس را چک می‌کند
# (bookworm-slim ابزار wget ندارد؛ از fetch خود Node استفاده می‌کنیم)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/bootstrap').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

# اجرای سرور standalone
CMD ["node", "server.js"]

# ─── Stage 4: one-shot schema migrator ────────────────────────
# deploy.sh این ایمیج کوچک را یک‌بار روی volume اجرا و سپس حذف می‌کند.
FROM node:22-bookworm-slim AS migrator

# کتابخانه openssl برای schema-engine پرایسما — کپی از builder بدون apt
COPY --from=builder /usr/lib/x86_64-linux-gnu/libssl.so.3* /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libcrypto.so.3* /usr/lib/x86_64-linux-gnu/

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma-cli-deps/node_modules/ ./node_modules/

USER nextjs
CMD ["node", "./node_modules/prisma/build/index.js", "db", "push", "--accept-data-loss"]
