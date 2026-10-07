# Build stage: installs the dependencies and runs the Vite build. Only the resulting
# static files make it into the final image.
FROM node:22-alpine AS build

ARG VITE_APP_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_APP_LANG
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_CLIENT_ID
ARG VITE_DEFAULT_POD_PROVIDER
ARG VITE_MAPBOX_ACCESS_TOKEN

# Cap the V8 heap of tsc/vite: the build peaks around 1 GB, and it runs on the
# Coolify server next to Fuseki, which must not get OOM-killed by a build.
ENV NODE_OPTIONS=--max-old-space-size=1536

WORKDIR /app/frontend

RUN apk add --update --no-cache autoconf bash libtool automake python3 py3-pip alpine-sdk openssh-keygen yarn nano

# Install packages first so that Docker doesn't run `yarn install` if the packages haven't changed
# See https://making.close.com/posts/reduce-docker-image-size
ADD frontend/package.json /app/frontend
ADD frontend/yarn.lock /app/frontend
RUN yarn install && yarn cache clean

ADD frontend /app/frontend

RUN yarn run build

# Runtime stage: a static file server, without the sources and node_modules
FROM node:22-alpine

RUN yarn global add serve

WORKDIR /app/frontend

COPY --from=build /app/frontend/dist ./dist

EXPOSE 4000

CMD serve -s dist -l 4000
