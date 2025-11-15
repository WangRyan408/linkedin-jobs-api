FROM oven/bun:1.3-debian AS base
WORKDIR /app


FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
#RUN bun test
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/dist ./dist
COPY --from=prerelease /app/src/migrations ./src/migrations
COPY --from=prerelease /app/package.json .

# Create directory for database
RUN mkdir -p /app/data \
    && chown -R bun:bun /app

# Set environment variable for database path
ENV DATABASE_PATH=/app/data/linkedin_jobs.db

# run the app
USER bun
ENTRYPOINT [ "bun", "run", "dist/index.js" ]