#!/bin/bash

node ../src/spot-import.js -f example_data.json --json -c postgres://localhost -t family -s family.session
