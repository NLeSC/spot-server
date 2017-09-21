/**
 * PostgreSQL specific functions
 *
 * it is using:
 *  * a pool of database connections
 *  * native bindings to the pg library
 *
 * usage:
 * ```
 * var PGConnector = require('./postgres-connector');
 * var connector = new PGConnector('postgres://localhost');
 * ```
 *
 * For connection settings, see fi. [this page](https://jdbc.postgresql.org/documentation/80/connect.html) for examples.
 * For securely setting a password [see here](https://www.postgresql.org/docs/9.1/static/libpq-pgpass.html).
 *
 * @module postgres-connector
 */

// With pg-native we will use the (faster) native bindings
var parseConnection = require('pg-connection-string').parse;

// use the native bindings for slightly more performance
var pg = require('pg').native;

// Do not do any parsing for postgreSQL datetime types
var types = require('pg').types;
var SQLDatetimeTypes = [1082, 1083, 1114, 1184, 1182, 1266];
SQLDatetimeTypes.forEach(function (type) {
  types.setTypeParser(type, function (val) { return val; });
});

// Do not do any parsing for postgreSQL interval type
types.setTypeParser(1186, function (val) { return val; });

/**
 * Parse the result of a select(*) query, and create facets matching
 * the returned column names and types
 *
 * Identification of column (facet) type is done by querying the postgres metadata:
 * dataTypeID: 1700,         numeric
 * dataTypeID: 20, 21, 23,   integers
 * dataTypeID: 700, 701,     float8
 *
 * @param {array} data the result of a postgres query
 * @param {Dataset} dataset the dataset
 */
function parseRows (data, dataset) {
  // TODO: split out generic stuff, only return array of facet types..
  // remove previous facets
  dataset.facets.reset();

  data.fields.forEach(function (field) {
    var type;

    var SQLtype = field.dataTypeID;
    if (SQLtype === 1700 || SQLtype === 20 || SQLtype === 21 || SQLtype === 23 || SQLtype === 700 || SQLtype === 701) {
      type = 'continuous';
    } else if (SQLtype === 17) {
      // ignore:
      // 17: wkb_geometry
      console.warn('Ignoring column of type 17 (wkb_geometry)');
      return;
    } else if (SQLDatetimeTypes.indexOf(SQLtype) > -1) {
      type = 'datetime';
    } else if (SQLtype === 1186) {
      type = 'duration';
    } else {
      // default to categorial
      // console.warn('Defaulting to categorial type for SQL column type ', SQLtype);
      type = 'categorial';
    }

    var sample = [];
    data.rows.forEach(function (row) {
      if (sample.length < 6 && sample.indexOf(row[field.name]) === -1) {
        sample.push(row[field.name]);
      }
    });

    dataset.facets.add({
      name: field.name,
      accessor: field.name,
      isActive: true,
      type: type,
      description: sample.join(', ')
    });
  });
}

/**
 * Perform an database query, and return a Promise
 *
 * @params{Squel.expr} q
 * @return {Promise} A promise object
 *
 */
function query (q) {
  var connector = this;

  return new Promise(function (resolve, reject) {
    connector.pool.connect(function (err, client, done) {
      if (err) {
        return console.error('error fetching client from pool', err);
      }

      client.query("set intervalstyle = 'iso_8601'; set time zone 'GMT'; " + q.toString(), function (err, result) {
        done(err);

        if (err) {
          console.error('error running query', err);
          reject(Error(err));
        }
        resolve(result);
      });
    });
  });
}

module.exports = function (connectionString) {
  var c = parseConnection(connectionString);

  this.pool = new pg.Pool(c);
  this.pool.on('error', function (err, client) {
    console.error('idle client error', err.message, err.stack);
  });

  this.disconnect = function () {
    this.pool.end();
  };

  this.query = query;
  this.parseRows = parseRows;
};
