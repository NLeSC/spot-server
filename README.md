# spot-pgserver
[![Build Status](https://travis-ci.org/NLeSC/spot-pgserver.svg?branch=master)](https://travis-ci.org/NLeSC/spot-pgserver)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Spot server connects to a database using a connection string, can be 'localhost'.
For testing, create a user 'postgres' with a database 'spot\_test'

## With metadata

it parses a session file for the available Datasets.

## Without metadata

spot-server scans all tables and constructs Datasets object

## Data import tool

Commandline tool to insert a dataset in the database.

1. Import a file from local file system
2. create Facets using scanData
3. Validate / normalize contents using the crossfilter dataset
4. Create database table where the columns and their types correspond to the Facets. TODO: mapping to best SQL types
5. Perform a COPY FROM and stream into the database
6. Update the metadata table

If node crashes with `heap out of memory`, increase it using `node --max_old_space_size=4096`.

# Client

## Connect

client connects to spot-server, and requests Datasets.
server sends the Datasets

## getData

client sends Datasets, the currently active Dataset, and the Filter
spot-server builds temporary table based on the Datasets / Dataset
spot-server executes query for the Filter on the temporary table

# Security concerns

## sql injection via `facet.accessor` and `dataset.datasetTable`

Facet accessor can be set by the client, and is used unchecked in the query.
Recommended to limit spot-server PostgreSQL privilege to read only.
See for instance (this blog post)[https://blog.ed.gs/2016/01/12/add-read-only-postgres-user/]
