const functions = require('firebase-functions');
const {dialogflow, Image, Table, BrowseCarousel, BrowseCarouselItem, Carousel, Suggestions, List} = require('actions-on-google')
const app = dialogflow()
const fetch = require('isomorphic-fetch')
const config = requre('./config')
const slugify = require('slugify')


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
    }).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
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
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}



/** Main handler for getting food venues
 * 
 * @param {*} agent 
 * @param {*} params 
 */
function getFoodVenues(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        // Most recent 10 events
        var venues = apiResponse['food_venues'].slice(0,10)
        var foodCarouselItems = {}
        venues.map((venue) => {
            let slug = slugify(venue['name'])
            let venueDetails = {
                title: venue['name'],
                description: venue['description'],
                image: new Image({
                  url: venue['thumbnail_url'] || defaultImageUrl,
                  alt: 'A photo of ' + venue['name'],
                }),
            }
            foodCarouselItems[slug] = venueDetails
        })
        conv.ask(`Here are a few places you can grab a bite.`)
        conv.ask(new Carousel({items: foodCarouselItems}))
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}


function getFoodVenueDetails(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        // Most recent 10 events
        var allVenues = apiResponse['food_venues']
        let selectedSlug = app.getSelectedOption()
        let mapBaseUrl = "https://www.google.com/maps/@"
        allVenues.map((venue) => {
            if ( slugify(venue['name']) == selectedSlug ) {
                conv.ask(`Here's some more info:`)
                conv.ask(new BasicCard({
                    text: venue['description'],
                    subtitle: venue['building_name'],
                    title: venue['name'],
                    buttons: [
                        new Button({
                            title: 'View Location',
                            url: mapBaseUrl + venue['latitude'] + ',' + venue['longitude'],
                        }), 
                        new Button({
                            title: 'Website',
                            url: venue['main_url'] || 'https://brocku.ca'
                        })
                    ],
                    image: new Image({
                        url: venue['image_url'],
                        alt: 'Photo of ' + venue['name'],
                    }),
                    display: 'CROPPED',
                    }))
                return
            }
        })
        conv.ask(`I couldn't find that venue. You requested: ` + selectedSlug)
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}




function getClubs(conv, params) {
    return fetchFromBrockApi('clubs').then((apiResponse => {
        // Most recent 10 events
        var allClubs = apiResponse['clubs']
        let searchTopic = params['searchTopic']
        if (searchTopic === '') {
            conv.ask(`There are currently ` + allClubs.length + ` active clubs at Brock. Try asking about a specific one.`)
            conv.ask(new Suggestions(['Sports Clubs', 'Musical Theatre Clubs']))
            return
        }
        // Filter the clubs to only those containing the search topic
        var foundClubs = allClubs.filter((club) => {
            return JSON.stringify(club).toLowerCase().indexOf(searchTopic) > -1
        })
        if ( ! foundClubs ) {
            conv.ask(`Sorry, I could find any clubs related to ` + searchTopic + `. Try saying it another way.`)
            return
        }
        // Map to Object for List structure
        foundClubsObject = {}
        foundClubs.map((club) => {
            foundClubsObject[slugify(club['name'])] = {
                title: club['name'],
                description: club['description'],
                image: new Image({
                  url: club['profile_photo'] || defaultImageUrl,
                  alt: 'Profile photo for ' + club['name'],
                }),
            }
        })
        conv.ask(`I found ` + foundClubs.length + ` clubs that might be related. Here are a few:`)
        conv.ask(new List({ title: searchTopic + ' Clubs', items: foundClubsObject }))
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
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

app.intent('get_food_venues', (conv, params) => {
    return getFoodVenues(conv, params)
})

app.intent('get_food_venues_details', (conv, params) => {
    return getFoodVenueDetails(conv, params)
})

app.intent('get_clubs', (conv, params) => {
    return getClubs(conv, params)
})

// Intent in Dialogflow called `Goodbye`
app.intent('Goodbye', conv => {
    conv.close('See you later!')
})

app.intent('Default Fallback Intent', conv => {
    conv.ask(`I didn't understand. Can you tell me something else?`)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)
