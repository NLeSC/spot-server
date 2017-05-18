var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Spot = require('spot-framework');
var Server = require('..');
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
  console.error('Give connection string');
  process.exit(1);
}

// Initialize
// **********
var spot;

if (options.session) {
  spot = new Spot(JSON.parse(fs.readFileSync(options.session, 'utf8')));
  console.log('Serving datasets:', spot.datasets.length);
  spot.datasets.forEach(function (d, i) {
    console.log(i, d.getId(), d.name);
  });
} else {
  // TODO: What to do without a session file? Probably scan the dataset.
  spot = new Spot({
    sessionType: 'server'
  });
}

var connector = new Server.connectors.Postgres(options.connectionString);
var server = new Server(io, connector, spot);

app.get('/', function (req, res) {
  var html = '<h1>Hello World</h1>';
  res.send(html);
});

server.run();
http.listen(3000, function () {
  console.log('listening on *:3000');
});
