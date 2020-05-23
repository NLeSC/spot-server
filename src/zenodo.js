/**
 * Create Zenodo entries
 *
 *
 * @module zenodo
 */

var moment = require('moment-timezone');


/**
 * Scan dataset and create Facets
 * when done, send new facets to client.
 *
 * @params {Session} SPOT session
 * @return {Promise} A promise for emitting 'syncFacets' on the socket
 */

function uploadZenodo (session) {

}


module.exports = {
    uploadZenodo: uploadZenodo
};
