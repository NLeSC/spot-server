var Spot = require('spot-framework');
var filterA;
var filterB;

// get a new Spot instance
var spot = new Spot({ sessionType: 'server' });

// connect to the server
spot.connectToServer('http://localhost:8000')

// get available datasets form the server
.then(function () {
  return spot.getDatasets();
})

// initialize a few filters, and ask for data
.then(function (datasets) {
  var dataset = spot.datasets.get('example_data.json', 'name');
  spot.toggleDataset(dataset);

  // add some filters
  filterA = spot.dataview.filters.add({ title: 'filter A' });
  filterB = spot.dataview.filters.add({ title: 'filter B' });

  // ... that partitions the data on 'lastName'
  filterA.partitions.add([ { facetName: 'lastName', rank: 1 } ]);

  // , and on 'age' using two bins; as minimum was 5 and maximum was 49 these will be
  // [5, 27) labelled as '16' and [27, 49] labelled as '38'
  filterB.partitions.add([ { facetName: 'age', rank: 1, groupingParam: 2 } ]);

  // ... and that takes the average over the 'age'
  filterA.aggregates.add([ { facetName: 'age', rank: 1, operation: 'avg' } ]);

  // initialize the filters
  filterA.initDataFilter();
  filterB.initDataFilter();

  return spot.dataview.getData();
})

// select some data ranges, and ask the server for new data
.then(function () {
  console.log(' = = = = = =');
  console.log('data filterA: group by last name, average of age');
  console.log(filterA.data);
  console.log(' = = = = = =');
  console.log('data filterB: binned by age in [5, 27) labelled "16", and (27, 49] labelled "38":');
  console.log(filterB.data);

  console.log('---------------------------');
  console.log('Selecting \'Jones\' in filterA');
  console.log('---------------------------');

  // select 'Jones' on filterA
  var partition = filterA.partitions.get(1, 'rank');

  partition.updateSelection({
    value: 'Jones'
  });
  filterA.updateDataFilter();

  return spot.dataview.getData();
})

// show the filterd data
.then(function () {
  console.log(' = = = = = =');
  console.log('data filterA: group by last name, average of age');
  console.log(filterA.data);
  console.log(' = = = = = =');
  console.log('data filterB: binned by age in [5, 27) labelled "16", and (27, 49] labelled "38":');
  console.log(filterB.data);

  console.log('Done, disconnecting');
  spot.disconnectFromServer();
})

// deal with asynchronous errors
.catch(function (error) {
  console.error('An error has occured: ' + error.message);
});
