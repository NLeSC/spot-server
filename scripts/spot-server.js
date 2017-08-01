var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Spot = require('spot-framework');
var SpotServer = require('..');
var commandLineArgs = require('command-line-args');
var commandLineUsage = require('command-line-usage');
var fs = require('fs');

/**
 * Commanline options
 */
var optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'print usage'
  },
  {
    name: 'connectionString',
    alias: 'c',
    type: String,
    description: 'database connection string: postgres://user:password@host:port/table, where we fall back to user defaults (from the OS) when parts are unspecified'
  },
  {
    name: 'session',
    alias: 's',
    type: String,
    description: 'A saved session with configured datasets'
  },
  {
    name: 'www',
    alias: 'w',
    type: String,
    description: 'Location (directory) containing an index.html to host'
  },
  {
    name: 'port',
    alias: 'p',
    type: Number,
    description: 'Port number to start the server on (default: 8000)'
  }
];

var usageSections = [
  {
    header: 'spot-server',
    content: 'Spot server'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
];

var options = commandLineArgs(optionDefinitions);

// Sanity check
// ************

// no commandline options, '-h', or '--help'
if (Object.keys(options).length === 0 || options.help) {
  console.log(commandLineUsage(usageSections));
  process.exit(0);
}

// no connection string
if (!options.connectionString) {
  console.error('No connection string');
  process.exit(1);
}

// no session file
if (!options.session) {
  console.error('No session file');
  process.exit(1);
}

// port number
if (!options.port) {
  options.port = 8000;
}

// Initialize
// **********
var spot = new Spot(JSON.parse(fs.readFileSync(options.session, 'utf8')));
spot.datasets.forEach(function (d, i) {
  console.log(i, d.getId(), d.name);
});

var connector = new SpotServer.connectors.Postgres(options.connectionString);
var server = new SpotServer(io, connector, spot);

// serve static files the given directory
app.use(express.static(options.www));
app.get('*', function (req, res, next) {
  res.sendFile(options.www + '/index.html');
});

server.run();
http.listen(options.port, function () {
  console.log('listening on ', options.port);
});
