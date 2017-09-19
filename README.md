# spot-server
[![Build Status](https://travis-ci.org/NLeSC/spot-server.svg?branch=master)](https://travis-ci.org/NLeSC/spot-server)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/fd4e2ef5897943ddb1c41a44a5943e8f)](https://www.codacy.com/app/NLeSC/spot-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=NLeSC/spot-server&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/fd4e2ef5897943ddb1c41a44a5943e8f)](https://www.codacy.com/app/NLeSC/spot-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=NLeSC/spot-server&amp;utm_campaign=Badge_Coverage)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Part of the spot-framework, spot-server provides a connection a to a database (currently PostgreSQL) instead of the default crossfilter backend.
It will also host a static website fi. [spot](https://github.com/NLeSC/spot) using Express.

API documenation [can be found here](https://nlesc.github.io/spot-server).

## prerequisites
The current backend is a [PostgreSQL](https://www.postgresql.org) database. Spot requires either a local or a remote service to run. Commutication between the client and the database server is achieved by using [web socket](https://github.com/socketio/socket.io).
Before running the scripts, make sure that the Postgres server is up and running.

 - **Hint**: You may want to use [PostreSQL Docker image](https://hub.docker.com/_/postgres) for quick testing.
 - [pg_isready](https://www.postgresql.org/docs/9.3/static/app-pg-isready.html) command might be useful to check the server status.

## scripts

### spot-server

Combines this library with Express to host a website.
It uses a session file to keep track of database tables to serve.

Usage:
```bash
node scripts/spot-server.js -c 'postgres://USER<:PASSWORD>@localhost/DATABASE' -s session_file.json -w <SPOT_DIR>/dist/
```

Here, `SPOT_DIR` directs to the directory where you cloned and build the [spot app](https://github.com/NLeSC/spot).

run following command to see available options:
```bash
node scripts/spot-server.js --help
```
You can get a bit more performance using the native PostgreSQL bindings (turned off by default to make travisCI easier). Just install the pg-native package:
```bash
npm install pg-native
```
This in only tested on linux, could work on other OSs.


### spot-import

Import files (CSV, JSON) into the database.
It also creates a session file. Usage:

```bash
node ./scripts/spot-import.js -c 'postgres://USER<:PASSWORD>@localhost/DATABASE' \
-t 'data_table' \
-s 'session_file.json' \
-u 'http://DATA_URL' \
-d 'Dataset description' \
--csv -f 'test_data.csv'
```

run following command to see available options:
```bash
node server/spot-import.js --help
```


# Notes

## heap out of memory

If node crashes with `heap out of memory`, increase it using `node --max_old_space_size=4096`.

# Security concerns

## sql injection via `facet.accessor` and `dataset.datasetTable`

Facet accessor can be set by the client, and is used unchecked in the query.
Recommended to limit spot-server PostgreSQL privilege to read only.
See for instance [this blog post](https://blog.ed.gs/2016/01/12/add-read-only-postgres-user/)
