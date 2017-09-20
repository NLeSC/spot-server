var commandLineArgs = require('command-line-args');
var commandLineUsage = require('command-line-usage');

var fs = require('fs');

var prompt = require('prompt');

var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var csvTransform = require('stream-transform');
var streamify = require('stream-array');

var pg = require('pg'); // .native not supported by pgStream
var pgStream = require('pg-copy-streams');
var squel = require('squel').useFlavour('postgres');
squel.create = require('../src/squel-create');

var Spot = require('spot-framework');
var misval = Spot.util.misval;

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
    name: 'file',
    alias: 'f',
    type: String,
    description: 'File to import'
  },
  {
    name: 'csv',
    type: Boolean,
    description: 'File is in CSV format'
  },
  {
    name: 'json',
    type: Boolean,
    description: 'File is in JSON format'
  },
  {
    name: 'table',
    alias: 't',
    type: String,
    description: 'Table name'
  },
  {
    name: 'session',
    alias: 's',
    type: String,
    description: 'A saved session with configured datasets'
  },
  {
    name: 'url',
    alias: 'u',
    type: String,
    description: 'Dataset URL'
  },
  {
    name: 'description',
    alias: 'd',
    type: String,
    description: 'Dataset description'
  },
  {
    name: 'interactive',
    alias: 'i',
    type: Boolean,
    description: 'Interactively define data types'
  }
];

var usageSections = [
  {
    header: 'spot-import',
    content: 'Imports a CSV or JSON file to a SQL database and updates the metadata table'
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
  process.exit(1);
}

// contradictory file formats
if (options.csv && options.json) {
  console.error('Give either CSV or JSON options, not both');
  process.exit(1);
}

// no file to import
if (options.file) {
  if (!(options.csv || options.json)) {
    console.error('Give either CSV or JSON filetype');
    process.exit(1);
  }
}

// no connection string
if (!options.connectionString) {
  console.error('Give connection string');
  process.exit(1);
}

// no table name
if (!options.table) {
  // TODO check if name is valid
  console.error('Give table name');
  process.exit(1);
}

/**
 * Load data form a file
 * @param {Spot} spot a spot instance
 * @param {hash} options
 */
function importFile (spot, options) {
  // create dataset structure
  var dataset = spot.datasets.add({
    name: options.file,
    description: options.description || 'no description',
    URL: options.url || 'no url',
    databaseTable: options.table
  });

  // parse
  if (options.json) {
    // assume JSON files are typically small-ish. load it fully into memory
    try {
      var allBytes = fs.readFileSync(options.file, 'utf8');
    } catch (err) {
      console.log(err);
      console.error('Cannot read file', options.file);
      process.exit(1);
    }

    // add the data to the dataset
    dataset.data = JSON.parse(allBytes);

    uploadDataset(spot, options, dataset);
  } else if (options.csv) {
    // do not assume anything about the size of the CSV file
    // but read first 1000 records only

    var inStream = fs.createReadStream(options.file);
    var parser = csvParse({
      to: 1000,
      columns: true
    }, function (error, data) {
      if (error) {
        console.error(error);
        process.exit(1);
      }

      // add the data to the dataset
      console.log(data);
      dataset.data = data;
      uploadDataset(spot, options, dataset);
    });

    inStream.pipe(parser);
  }
}

function uploadDataset (spot, options, dataset) {
  // analyze data
  console.log('Scanning');
  dataset.scan();

  // create a table with a column per facet

  let dtypes = {};
  dataset.facets.forEach(function (facet) {
    facet.isActive = true;
    var dtype;
    if (facet.isCategorial) {
      dtype = 'varchar';
    } else if (facet.isContinuous) {
      dtype = 'real';
    } else if (facet.isDatetime) {
      dtype = 'timestamp with time zone';
    } else if (facet.isDuration) {
      dtype = 'interval';
    } else if (facet.isText) {
      dtype = 'varchar';
    }
    dtypes[facet.name] = dtype;
  });

  if(options.interactive){
    var promptSchema = {properties: {}};
    dataset.facets.forEach(function (facet) {
      promptSchema.properties[facet.name] = {
        default: dtypes[facet.name],
        pattern: /(varchar)|(real)|(interval)|(timestamp\ with\ time\ zone)/,
        message: 'Should be one of: varchar, real, timestamp with time zone, interval'
      }
    });
    console.log("Indicate the datatype of the facets. Should be one of: varchar, real, timestamp with time zone, interval");
    let inputType = new Promise( (resolve, reject) => {

        prompt.start();
        prompt.get(promptSchema, function(err, result){
          if(err){
            console.error(error);
            process.exit(1);
          }
          resolve(result);
        });
      });
      inputType.then(function(result){
        dtypes = result;
        pushFacets(spot, options, dataset, dtypes);
      })
  }
  else {
    pushFacets(spot, options, dataset, dtypes);
  }
}

function pushFacets(spot, options, dataset, dtypes){
  var columns = [];
  var valueFns = {};
  var q = squel.create().table(options.table);
  dataset.facets.forEach(function (facet) {
    if(dtypes[facet.name]) {
      q.field(facet.name, dtypes[facet.name]);
    }
    columns.push(facet.name);
    valueFns[facet.name] = Spot.util.dx.valueFn(facet);
  });

  var client = new pg.Client(options.connectionString);
  client.on('drain', client.end.bind(client));
  client.connect(function (err) {
    if (err) throw err;

    // setup copy from
    var command = 'COPY ' + options.table + ' FROM STDIN ';
    command = command + '( ';
    command = command + 'FORMAT CSV, ';
    command = command + "DELIMITER '\t', ";
    command = command + "QUOTE '\b', "; // defaults to '"' which can give problems
    command = command + 'NULL ' + misval + ' ';
    command = command + ') ';
    console.log(command.toString());

    // create table & sink
    client.query('DROP TABLE IF EXISTS ' + options.table);
    client.query(q.toString());
    console.log(q.toString());
    var sink = client.query(pgStream.from(command));

    // create formatter
    var formatter = csvStringify({
      columns: columns,
      quote: false,
      quotedEmpty: false,
      delimiter: '\t',
      rowDelimiter: 'unix',
      formatters: {
        object: function (o) {
          return o.toISOString();
        }
      }
    });

    // create transformer
    var transformer = csvTransform(function (data) {
      columns.forEach(function (column) {
        data[column] = valueFns[column](data);
      });
      return data;
    });

    console.log('Streaming to database');

    if (options.json) {
      streamify(dataset.data).pipe(transformer).pipe(formatter).pipe(sink);
    } else if (options.csv) {
      var inStream = fs.createReadStream(options.file);
      var parser = csvParse({
        columns: true
      }, function (error, data) {
        if (error) {
          console.error(error);
          process.exit(1);
        }
      });
      inStream.pipe(parser).pipe(transformer).pipe(formatter).pipe(sink);
    }
  });

  writeSession(spot, options);
}

function writeSession (spot, options) {
  var json = spot.toJSON();
  json.sessionType = 'server';

  // write
  console.log('Writing session');
  fs.writeFileSync(options.session, JSON.stringify(json, null, '\t'));
}

// *********************
// Do import
// *********************

// Load current config
var spot;
var contents;

console.log('Opening session: ', options.session);
try {
  contents = JSON.parse(fs.readFileSync(options.session, 'utf8'));
  spot = new Spot(contents);
} catch (err) {
  console.log('Failed to load session, creating new session file');
  spot = new Spot({
    sessionType: 'client'
  });
}

if (options.file) {
  importFile(spot, options);
}
