/** Methods for handling Library Occupancy
 * 
 */

const Table = require('actions-on-google')
const {defaultErrorResponse} = require('./responses')
const fetchFromBrockApi = require('./helpers')


/** Fufilling library occupancy request for all floors, or specific floor
 * 
 * @since 1.0.0
 * @param {*} agent
 */
module.exports.getLibraryOccupancy = function(conv, params) {
    return fetchFromBrockApi('wifi').then((res) => {
        let requestedFloor = params['libraryFloor'].toString()
        var floors = res['library']
        if (requestedFloor != '') {
            // Attempt to find the floor, otherwise continue
            for (var i = 0; i < floors.length; i++) {
                if (floors[i]['floor'] == requestedFloor) {
                    let speech = 'Floor ' + floors[i]['floor']
                    speech += ' in the library is currently ' + floors[i]['status'].toLowerCase()
                    conv.ask(speech)
                    return
                }
            }
        }
        if ( ! conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT') ) {
            // The user doesn't have a screen, return a text response
            let speech = res['library'].map((floor) => {
                return " Floor " + floor['floor'] + " is " + floor['status'].toLowerCase()
            })
            conv.ask(`Here's how all the library floors are looking right now.` + speech)
            return
        }
        conv.ask(`Here's how all the library floors are looking right now.`)
        conv.ask(new Table({
            dividers: true,
            columns: ['Library Floor', 'Occupancy'],
            rows: floors.map((floor) => {
                return [floor['floor'], floor['status']]
            }),
        }))
    }).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}
