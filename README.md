# spot-server
[![Build Status](https://travis-ci.org/NLeSC/spot-server.svg?branch=master)](https://travis-ci.org/NLeSC/spot-server)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/fd4e2ef5897943ddb1c41a44a5943e8f)](https://www.codacy.com/app/NLeSC/spot-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=NLeSC/spot-server&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/fd4e2ef5897943ddb1c41a44a5943e8f)](https://www.codacy.com/app/NLeSC/spot-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=NLeSC/spot-server&amp;utm_campaign=Badge_Coverage)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Part of the spot-framework, spot-server provides a connection a to a database (currently PostgreSQL) instead of the default crossfilter backend.

## scripts

### spot-server

Combines this library with Express to host a website.
It uses a session file to keep track of database tables to serve.

### spot-import

Import files (CSV, JSON) into the database.
It also creates a session file.


# Notes

## heap out of memory

If node crashes with `heap out of memory`, increase it using `node --max_old_space_size=4096`.

# Security concerns

## sql injection via `facet.accessor` and `dataset.datasetTable`

Facet accessor can be set by the client, and is used unchecked in the query.
Recommended to limit spot-server PostgreSQL privilege to read only.
See for instance (this blog post)[https://blog.ed.gs/2016/01/12/add-read-only-postgres-user/]
