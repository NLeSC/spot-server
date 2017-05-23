var Spot = require('spot-framework');
var dataset;
var filterA;
var filterB;

// initialize a few filters, and ask for data
function doSomething () {
  dataset = spot.datasets.get('example_data.json', 'name');
  spot.toggleDataset(dataset);

  // add some filters
  filterA = spot.dataview.filters.add({ title: 'filter A' });
  filterB = spot.dataview.filters.add({ title: 'filter B' });

  // ... that partitions the data on 'lastName'
  filterA.partitions.add([ { facetName: 'lastName', rank: 1 } ]);

  // , and on 'age' using two bins; as minimum was 5 and maximum was 49 these will be
  // [5, 27) labelled as '16' and [27, 49] labelled as '38'
  filterB.partitions.add([ { facetName: 'age', rank: 1, groupingParam: 2 } ]);

  filterA.partitions.forEach(function (partition) { partition.setGroups(); });
  filterB.partitions.forEach(function (partition) { partition.setGroups(); });

  // ... and that takes the average over the 'age'
  filterA.aggregates.add([ { facetName: 'age', rank: 1, operation: 'avg' } ]);

  // initialize the filters
  filterA.initDataFilter();
  filterB.initDataFilter();

  // listen to data
  filterA.on('newData', function () {
    console.log('data filterA: group by last name, average of age');
    console.log(this.data);
  }, filterA);

  filterB.on('newData', function () {
    console.log('data filterB: binned by age in [5, 27) labelled "16", and (27, 49] labelled "38":');
    console.log(this.data);
  }, filterB);

  spot.dataview.getData();
}

// select some data ranges, and ask the server for new data
function doSomethingElse () {
  console.log('---------------------------');
  console.log('Selecting \'Jones\'');
  console.log('---------------------------');

  // select 'Jones' on filterA
  var partition = filterA.partitions.get(1, 'rank');

  partition.updateSelection({
    value: 'Jones'
  });
  filterA.updateDataFilter();

  spot.dataview.getData();
}

// close the connection
function doNoMore () {
  // finished
  spot.disconnectFromServer();
}

// get a new Spot instance
var spot = new Spot({
  address: 'http://localhost:3000',
  sessionType: 'server'
});

spot.connectToServer();

// wait a bit for the connection and to receive datasets
setTimeout(doSomething, 5000); // initialize a few filters, and ask for data
setTimeout(doSomethingElse, 10000); // select some data ranges, and ask the server for new data
setTimeout(doNoMore, 15000); // close the connection
