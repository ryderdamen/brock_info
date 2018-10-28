
const fetch = require('isomorphic-fetch')
const config = requre('./config')



/** Concerts a string to title case
 * 
 * @param {*} str 
 */
function titleCase(str) {
    str = str.toLowerCase().split(' ')
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1)
    }
    return str.join(' ')
}


/** Fetches an endpoint from the Brock API using the config file
 * 
 * @since 1.0.0
 * @param {*} endpoint 
 * @param {*} queryString 
 * @returns {Promise} a promise resolving to JSON response or rejecting false
 */
function fetchFromBrockApi(endpoint, queryString="") {
    let ep = config['api']['endpoints'][endpoint]
    let protocol = config['api']['protocol']
    let host = config['api']['hostname']
    var url = protocol + host + ep['endpoint'] + '?key=' + ep['key'] + queryString
    return fetch(url).then((response) => {
        if (response.status == 200) {
            return response.json()
        } else {
            throw 'Error: Non 200 Status Code: ' + response.status
        }
    }).catch((error)=> {
        throw error
    })
}


module.exports.fetchFromBrockApi = fetchFromBrockApi
module.exports.titleCase = titleCase