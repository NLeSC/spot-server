/**
 * Spot server module
 *
 * For usage and examples, see the ```example``` directory and ```scripts/spot-server.js```.
 *
 * Usage:
 * ```
 * var Spot = require('spot-framework');
 * var Server = require('spot-server');
 * var io = require('socket.io')(http);
 * var connector = new Server.connectors.Postgres('postgres://localhost');
 *
 * var spot = new Spot({
 *   sessionType: 'server'
 * });
 *
 * var server = new Server(io, connector, spot);
 * server.run();
 * ```
 *
 * @module spot-server
 */
var Dataview = require('spot-framework').constructors.Dataview;
var Dataset = require('spot-framework').constructors.Dataset;
var Datasets = require('spot-framework').constructors.Datasets;

var driver = require('./sql-driver');

function run (io, server) {
  var dataview = new Dataview();
  var dataset = new Dataset();
  var datasets = new Datasets();

  /*
   * Setup socket callback functions
   */
  io.on('connection', function (socket) {
    console.log('Connecting to client');

    /**
     * @function
     */
    socket.on('getDatasets', function (req) {
      console.log('Sending datasets');
      server.sendDatasets(server.spot.datasets);
    });

    /**
     * @function
     * @params {Object} req
     * @params {string} req.dataset Serialized dataset
     */
    socket.on('scanData', function (req) {
      console.log('Scanning database');
      console.time(req.dataset.id + ': syncFacets');
      dataset.set(req.dataset);
      driver.scanData(server, dataset);
    });

    /**
     * @function
     * @params {Object} req
     * @params {string} req.datasets Serialized datasets
     * @params {string} req.dataview Serialized dataview
     */
    socket.on('getMetaData', function (req) {
      console.time(req.dataview.id + ': getMetaData');
      datasets.reset(req.datasets);
      dataview = new Dataview(req.dataview);
      driver.getMetaData(server, datasets, dataview);
    });

    /**
     * Send data for each filter in the dataview, and then send new meta data
     * Filter data is guaranteed to be send first, so after receiving meta data
     * at the client, all filters have been updated
     *
     * @function
     * @params {Object} req
     * @params {string} req.datasets Serialized datasets
     * @params {string} req.dataview Serialized dataview
     */
    socket.on('getData', function (req) {
      var singleRequests = [];

      datasets.reset(req.datasets);
      dataview = new Dataview(req.dataview);

      dataview.filters.forEach(function (filter) {
        console.time(filter.getId() + ': getData');
        singleRequests.push(driver.getData(server, datasets, dataview, filter));
      });

      console.time(dataview.getId() + ': getMetaData');
      Promise.all(singleRequests)
      .then(function (values) {
        return driver.getMetaData(server, datasets, dataview);
      })
      .catch(function (error) {
        throw new Error('Cannot finish getData: ' + error.message);
      });
    });

    /**
     * @function
     * @params {Object} req
     * @params {string} req.dataset Serialized dataset
     * @params {string} req.facetId of the facet
     */
    socket.on('setMinMax', function (req) {
      console.time(req.dataset.id + ': syncFacets');
      dataset.set(req.dataset);
      driver.setMinMax(server, dataset, dataset.facets.get(req.facetId));
    });

    /**
     * @function
     * @params {Object} req
     * @params {string} req.dataset Serialized dataset
     * @params {string} req.facetId of the facet
     */
    socket.on('setCategories', function (req) {
      console.time(req.dataset.id + ': syncFacets');
      dataset.set(req.dataset);
      driver.setCategories(server, dataset, dataset.facets.get(req.facetId));
    });

    /**
     * @function
     * @params {string} req.dataset Serialized dataset
     * @params {string} req.facetId of the facet
     */
    socket.on('setPercentiles', function (req) {
      console.time(req.dataset.id + ': syncFacets');
      dataset.set(req.dataset);
      driver.setPercentiles(server, dataset, dataset.facets.get(req.facetId));
    });

    socket.on('disconnect', function () {
      // we keep no track of connections, so nothing to be done here
      console.log('Client requests: disconnect');
    });
  });
}

module.exports = function SpotServer (io, connector, spot) {
  this.io = io; // web socket to serve on
  this.connector = connector;
  this.spot = spot;

  /**
   * Connect to the websocket and start listening
   */
  this.run = function () {
    run(io, this);
  };

  /**
   * Send Datasets from the server to the client
   *
   * @params {Datasets} datasets
   * { data: datasets.toJSON }
   */
  this.sendDatasets = function (datasets) {
    io.emit('syncDatasets', {
      data: datasets.toJSON()
    });
  };

  /**
   * Send Dataview from the server to the client
   *
   * @params {Datasets} datasets
   * { data: dataview.toJSON }
   */
  this.sendDataview = function (dataview) {
    io.emit('syncDataview', {
      data: dataview.toJSON()
    });
  };

  /**
   * Send Facets of a dataset from the server to the client
   *
   * @params {Dataset} dataset
   * { datasetId: dataset.getId(), data: facets.toJSON() }
   */
  this.sendFacets = function (dataset) {
    io.emit('syncFacets', {
      datasetId: dataset.getId(),
      data: dataset.facets.toJSON()
    });
    console.timeEnd(dataset.getId() + ': syncFacets');
  };

  /**
   * Send data from the server to the client
   * @params {Filter} filter
   * @params {Data} data
   * { filterId: filter.getId(), data: data }
   */
  this.sendData = function (filter, data) {
    io.emit('newData', {
      filterId: filter.getId(),
      data: data
    });
    console.timeEnd(filter.getId() + ': getData');
  };

  /**
   * Send metadata from the server to the client
   * @params {Dataview} dataview
   * @params {number} total
   * @params {number} selected
   * { dataTotal: total, dataSelected: selected }
   */
  this.sendMetaData = function (dataview, total, selected) {
    io.emit('newMetaData', {
      dataTotal: total,
      dataSelected: selected
    });
    console.timeEnd(dataview.getId() + ': getMetaData');
  };
};

module.exports.connectors = {
  Postgres: require('./postgres-connector')
};
