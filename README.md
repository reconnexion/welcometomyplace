[![SemApps](https://badgen.net/badge/Powered%20by/SemApps/28CDFB)](https://semapps.org)

![](./frontend/public/logo192.png)

# Welcome to my place

This application is about events which are private by default: you only see those you have been invited to. Anyone is free to create an event and share it with its network. After an event, all participants can add the contact of all other participants. But at the beginning, you must know the contact link (or the ID of type `@bob@podprovider.com`) to start your personal network.

All data are stored directly in users Pods. See the [ActivityPods](https://github.com/activitypods/activitypods) project for more information.

## Launch locally

### Requirements

- Git
- Makefile
- [Docker](https://docs.docker.com/engine/install/) (make sure you have the `docker-compose-plugin` installed)
- [NodeJS](https://nodejs.org) 20.0 or above
- [Yarn](https://yarnpkg.com/)

### Setup environment variables

A single environment variable is required: the MapBox access token to autocomplete the location field on the Pod provider and app frontends.

Fortunately MapBox has a generous free tier with 100,000 requests per month, so you should not need to pay anything. But you still need to get the token. [See this page](https://docs.mapbox.com/help/getting-started/access-tokens/) for more information.

Once you have your access token, create a `.env.local` file in the `/frontend` directory and set it there.

```bash
VITE_MAPBOX_ACCESS_TOKEN=
```

### Run the Pod provider

In order to locally run the boilerplate, you need a local Pod provider, because a remote Pod provider will not be able to interact with a local application backend.

Fortunately, we provide [Docker images](https://hub.docker.com/orgs/activitypods/repositories) to launch a local Pod provider in a single command:

```bash
make start
```

This will also launch Jena Fuseki (the triplestore used to store semantic data) and Redis, which are needed by the Pod provider and will also be used by the application.

### Launch the backend

Although Docker could also be used to launch the application backend, we recommend to launch it outside of Docker to avoid the usual problems we encounter in containerized environments.

On the other hand, we will use the same Fuseki and Redis server as used for the ActivityPods backend.

```bash
cd backend
yarn install
yarn run dev
```

The backend targets an ActivityPods **2.3** Pod provider (`next` branch): `@activitypods/app` must be 2.3.x and `@semapps/*` 1.2.x. The 2.2/1.1 releases still expect the `interop:DataGrant`s that 2.3 removed — with them, the app's registration silently fails on the backend side (`One or more required access needs have not been granted` in the Bull queue), no inbox/outbox listener gets created, and the frontend shows "The app is not listening to …". When linking the local framework (see [below](#linking-to-semappsactivitypods-packages-optional)), note it is TypeScript, hence `yarn run dev` going through `tsx`.

This will bootstrap the server and, if there are no errors, finish with a message telling you that Moleculer's ServiceBroker has started.

You can see the application details at http://localhost:3001/app

You now have access to Moleculer CLI. Enter this command to insert all the available event formats:

```
call importers.formats.freshImport
```

### Launch the frontend

Now you can launch the app frontend.

```bash
cd frontend
yarn install
yarn run dev
```

A browser window should automatically be launched. If not, you can access the app frontend at http://localhost:4000

## Linking to SemApps/ActivityPods packages (optional)

If you wish to modify packages on the [SemApps repository](https://github.com/assemblee-virtuelle/semapps) and the [ActivityPods repository](https://github.com/activitypods/activitypods) and see the changes before they are published, see the following instructions.

### Linking backend packages

To link backend packages, you can use [`yarn link`](https://classic.yarnpkg.com/en/docs/cli/link/).

```bash
cd /SEMAPPS_REPO/src/middleware
yarn run link-all
cd /ACTIVITYPODS_REPO/app-framework
yarn run link-all
cd /THIS_REPO/backend
yarn run link-packages
```

The frontend has no `@semapps/*` or `@activitypods/react` dependencies to link — it only depends on `@activitypods/refine-providers`, published normally to npm. If you need to test unpublished changes to that package, link it directly with `yarn link` from its own repository.

## Dev environment and pull request previews (Coolify)

The dev instance and one preview per pull request are built and run by [Coolify](https://coolify.io) directly from this repository, using [`docker-compose.coolify.yml`](./docker-compose.coolify.yml) and the Dockerfiles in [`/docker`](./docker). No image is built by GitHub Actions for them (the workflow only builds the release images on `v*` tags).

How it is wired in Coolify:

- One **application** (build pack _Docker Compose_, compose file `/docker-compose.coolify.yml`) follows the dev branch: every push rebuilds and redeploys it.
- **Preview deployments** are enabled on that application: opening or updating a pull request builds a separate stack on its own domain (see the _Preview URL Template_ of the application), and closing or merging the PR removes it. The GitHub App adds a comment with the preview link on each PR. Only pull requests targeting the branch the application follows get a preview.
- The stacks share the Fuseki of the `shared-infra` service but each one uses its own datasets, named after the stack (`<DATASET_PREFIX>-backend`, `<DATASET_PREFIX>-backend-pr-<n>`), and its own Redis. Only the backend joins the shared `coolify` network.
- The frontend URLs are inlined by Vite at build time, so the compose file passes the domain Coolify generated for the stack (`SERVICE_FQDN_*`) as build arguments. The variables to set in Coolify (`APP_NAME`, `SPARQL_ENDPOINT`, `JENA_PASSWORD`, `MAPBOX_ACCESS_TOKEN`...) are listed at the top of the compose file; they must be set for both the production and the preview scopes.

The builds run on the Coolify server: the frontend image caps the Node heap (`NODE_OPTIONS` in `docker/frontend.dockerfile`) so that a build cannot starve the other containers, Fuseki in particular.

## Deploy to production

The `docker-compose-prod.yml` includes everything you need to deploy this app to production:

- The backend of the app
- The frontend of the app
- [Traefik](https://traefik.io) to orchestrate domain names and SSL certificates
- [Apache Jena Fuseki](https://jena.apache.org/documentation/fuseki2/) to store semantic data
- [Redis](https://redis.io) used for cache and jobs queue
- [Arena](https://github.com/bee-queue/arena) to watch the jobs queue

### Requirements

A Linux server with 4Gb of RAM is required for Fuseki to work properly, otherwise there is a high risk that it runs out of memory and gets killed. For large Pod providers, we recommend 8Gb of RAM.

### Point your domains to your server IP

Go to your domain provider and point the domain you want to use to your server IP (with a A-type registration).

Note that, by default, the backend will be on the same domain name as the frontend, but on the /api path.

### Clone this repository

Connect to your server in SSH and clone this repository:

```bash
git clone https://github.com/assemblee-virtuelle/welcometomyplace.git
```

### Install Docker with the Compose plugin

We have prepared a script for this:

```bash
./install-docker.sh
```

If that doesn't work with your server config, you can follow [Docker installation instructions](https://docs.docker.com/engine/install/).

### Setup .env variables

Copy the `.env.production` file to a `.env.production.local` file (`cp .env.production .env.production.local`) and enter your server-specific informations. [Click here](https://docs.mapbox.com/help/getting-started/access-tokens/) to find how to generate a MapBox access token, which is necessary for the autocomplete feature.

```env
DOMAIN_NAME=welcometomyplace.org
BACKEND_PATH=/api
APP_NAME=Welcome to my place
APP_DESCRIPTION="Foster living together based on welcome, trust and mutual aid"
APP_LANG=en
LETSENCRYPT_EMAIL=
FUSEKI_PASSWORD=
MAPBOX_ACCESS_TOKEN=
DEFAULT_POD_PROVIDER=  # If you want to enforce a Pod provider for this app
```

If you want to customize more thoroughly the app, you can do the same with the `.env.production` files in the /backend and /frontend directories (copy them to a `.env.production.local` file). Note all env files ending with `.local` are not commited.

To manage several deployments from the same checkout (e.g. a staging instance on another domain), keep one env file per deployment and pass it to `make` with `PROD_ENV_FILE`:

```bash
make build-prod PROD_ENV_FILE=.env.production.dev.local
```

### Build and launch

You can now launch the Docker containers with this command:

```
make build-prod
make start-prod
```

If there is a problem, you can call `make attach-backend-prod`, which will give you access to ActivityPods' Moleculer CLI ([Moleculer](https://moleculer.services/) is the microservice framework that all ActivityPods services run on.) Errors will be displayed here.

### Explore your server

The frontend should now be available at the domain you chose. The backend is available on the `/api` path.

Fuseki provides also a frontend to see the datasets. It is available on port 3030 of your server. The login is "admin" and the password is the one you chose on the global environment variables.

You can also see the jobs queue by connecting to Arena on port 4567 of your server.
