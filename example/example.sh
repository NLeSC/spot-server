#!/bin/bash

# import the data into the database
rm -rf example.session
node ../scripts/spot-import.js -f example_data.json --json -c postgres://localhost -t family -s example.session

# run a server in the background
node ../scripts/spot-server.js -c postgres://localhost -s example.session -w `pwd`/site -p 8000 &

# run the example program
node example.js

# terminate backgrounded server
trap "killall node" EXIT
