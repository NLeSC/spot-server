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
 * Perform an database query, and perform callback with the result
 *
 * @params{Squel.expr} q
 * @params{function} cb
 * @params{scope} scope scope for the callback
 */
function queryAndCallBack (q, cb, scope) {
  this.pool.connect(function (err, client, done) {
    if (err) {
      return console.error('error fetching client from pool', err);
    }

    client.query("set intervalstyle = 'iso_8601'; set time zone 'GMT'; " + q.toString(), function (err, result) {
      done(err);

      if (err) {
        return console.error('error running query', err);
      }
      cb.call(scope, result);
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

  this.queryAndCallBack = queryAndCallBack;
};
