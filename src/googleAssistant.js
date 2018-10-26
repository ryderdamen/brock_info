const functions = require('firebase-functions');
const {dialogflow, Image, Table, BrowseCarousel, BrowseCarouselItem} = require('actions-on-google')
const app = dialogflow()
const fetch = require('isomorphic-fetch')
const config = requre('./config')

const defaultErrorResponse = "Sorry, I wasn't able to get that info. Try back later."
const defaultImageUrl = "https://brocku.ca/media-room/wp-content/uploads/sites/61/brocku-384x232.png"



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


/** Handler for fufilling library occupancy request
 * 
 * @since 1.0.0
 * @param {*} agent 
 */
function getLibraryOccupancy(conv, params) {
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
        if (!conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
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
    }).catch((err) => {
        console.error('Unable to retrieve response: ' + err)
        conv.ask(defaultErrorResponse)
    })
}


/** Main handler for getting events
 * 
 * @param {*} agent 
 * @param {*} params 
 */
function getEvents(conv, params) {
    return fetchFromBrockApi('all-events').then((apiResponse => {
        // Most recent 10 events
        var events = apiResponse['events'].slice(0,10)
        var eventCarouselItems = events.map((event) => {
            return new BrowseCarouselItem({
                title: event['event_name'],
                url: event['event_url'],
                description: event['description'],
                image: new Image({
                    url: event['thumbnail_url'] || defaultImageUrl,
                    alt: 'Event Flyer',
                }),
                footer: 'Hosted By: ' + event['organization_name'],
            })
        })

        conv.ask(`Here are the most recent events.`)
        conv.ask(new BrowseCarousel({
            items: eventCarouselItems,
        }))
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + err)
        conv.ask(defaultErrorResponse)
    })
}


// Intent Mapping
app.intent('get_library_occupancy', (conv, params) => {
    return getLibraryOccupancy(conv, params)
})

app.intent('get_events', (conv, params) => {
    return getEvents(conv, params)
})

// Intent in Dialogflow called `Goodbye`
app.intent('Goodbye', conv => {
    conv.close('See you later!')
})

app.intent('Default Fallback Intent', conv => {
    conv.ask(`I didn't understand. Can you tell me something else?`)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
