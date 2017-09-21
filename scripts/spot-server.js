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

// port number
if (!options.port) {
  options.port = 8000;
}

// Initialize
// **********
var connector = new SpotServer.connectors.Postgres(options.connectionString);

// Start the express server: serve static files from the given directory
app.use(express.static(options.www));
app.get('*', function (req, res, next) {
  res.sendFile(options.www + '/index.html');
});

var spot;

// call back function to be used below
function run () {
  // print datasets that will be served
  spot.datasets.forEach(function (d, i) {
    console.log(i, d.getId(), d.name);
  });

  // Start the spot server: connect the spot-client with the database
  var server = new SpotServer(io, connector, spot);
  server.run();
  http.listen(options.port, function () {
    console.log('listening on ', options.port);
  });
}

if (options.session) {
  spot = new Spot(JSON.parse(fs.readFileSync(options.session, 'utf8')));
  run();
} else {
  spot = new Spot({
    sessionType: 'server'
  });
  Promise
  .all([connector.query('select tablename from pg_catalog.pg_tables where tableowner=current_user')])
  .then(function (data) {
    var tables = data[0].rows;

    tables.forEach(function (table) {
      spot.datasets.add({
        name: table.tablename,
        databaseTable: table.tablename
      });
    });
    console.log('Added tables from database');
    run();
  });
}
