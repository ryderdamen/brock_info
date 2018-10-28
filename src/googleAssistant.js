const functions = require('firebase-functions');
const {dialogflow, Image, Table, BrowseCarousel, BrowseCarouselItem, Carousel, Suggestions, List, BasicCard, Button} = require('actions-on-google')
const app = dialogflow()
const fetch = require('isomorphic-fetch')
const config = requre('./config')
const slugify = require('slugify')
const moment = require('moment');



const defaultErrorResponse = "Sorry, I wasn't able to get that info. Try back later."
const defaultImageUrl = "https://brocku.ca/media-room/wp-content/uploads/sites/61/brocku-384x232.png"



function titleCase(str) {
    str = str.toLowerCase().split(' ');
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
    }
    return str.join(' ');
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


/** Fufilling library occupancy request for all floors, or specific floor
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


/** Retrieves all current events
 * 
 * @param {*} agent 
 * @param {*} params 
 */
function getEvents(conv, params) {
    return fetchFromBrockApi('all-events').then((apiResponse => {
        // Most recent 10 events
        var events = apiResponse['events'].slice(0,10)
        var eventCarouselItems = events.map((event) => {
            var descriptionText = moment(event['start_datetime']).calendar() + `  \n`
            descriptionText += event['location'] + `  \n`
            descriptionText += event['description']
            return new BrowseCarouselItem({
                title: event['event_name'],
                url: event['event_url'],
                description: descriptionText,
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


/** Main handler for getting all food venues
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


/** Returns more specific details about a food venue
 * 
 * @param {*} conv 
 * @param {*} params 
 */
function getFoodVenueDetails(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        // Most recent 10 events
        var allVenues = apiResponse['food_venues']
        let selectedSlug = conv.arguments.get('OPTION')
        console.error('selected slub is ' + selectedSlug)
        let mapBaseUrl = "https://www.google.com/maps/@"
        let foundVenue = false
        allVenues.map((venue) => {
            if ( slugify(venue['name']) === selectedSlug ) {
                conv.ask(`Here's some more info:`)
                conv.ask(new BasicCard({
                    text: venue['description'],
                    subtitle: venue['building_name'],
                    title: venue['name'],
                    buttons: [
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
                foundVenue = true
            }
        })
        if (foundVenue === false) {
            conv.ask(`I couldn't find that venue.`)
        }
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}



/** Handles retrieval of all clubs, and search of clubs
 * 
 * @param {*} conv 
 * @param {*} params 
 */
function getClubs(conv, params) {
    return fetchFromBrockApi('clubs').then((apiResponse => {
        // Most recent 10 events
        var allClubs = apiResponse['clubs']
        let searchTopic = params['searchTopic'].toLowerCase()
        if (searchTopic === '') {
            conv.ask(`There are currently ` + allClubs.length + ` active clubs at Brock. Try asking about a specific one.`)
            conv.ask(new Suggestions(['Sports Clubs', 'Musical Theatre Clubs']))
            return
        }
        // Filter the clubs to only those containing the search topic
        var foundClubs = allClubs.filter((club) => {
            return JSON.stringify(club).toLowerCase().indexOf(searchTopic) > -1
        })
        if ( (foundClubs === undefined || foundClubs.length == 0) ) {
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
        conv.ask(`I found ` + foundClubs.length + ` clubs mentioning ` + searchTopic + `. Here are a few:`)
        conv.ask(new List({ title: titleCase(searchTopic) + ' Clubs', items: foundClubsObject }))
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}


/** Retrieves and returns club details when a specific club is selected
 * 
 * @param {*} conv 
 * @param {*} params 
 */

function getClubDetails(conv, params) {
    return fetchFromBrockApi('clubs').then((apiResponse => {
        var allClubs = apiResponse['clubs']
        let selectedSlug = conv.arguments.get('OPTION')
        let foundClub = false
        allVenues.map((club) => {
            if ( slugify(club['name']) === selectedSlug ) {
                conv.ask(`Here's some more info:`)
                conv.ask(new BasicCard({
                    text: venue['description'],
                    subtitle: venue['building_name'],
                    title: venue['name'],
                    buttons: [
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
                foundClub = true
            }
        })
        if (foundClub === false) {
            conv.ask(`I couldn't find that club.`)
        }
    })).catch((apiError) => {
        console.error('Unable to retrieve response: ' + apiError)
        conv.ask(defaultErrorResponse)
    })
}


/** Gets the current events happening for a specific club
 * 
 * @param {*} conv 
 * @param {*} params 
 */
function getClubEvents(conv, params) {

}


/** Returns meta-data about the app
 * 
 * @param {*} conv 
 * @param {*} params 
 */
function getMeta(conv, params) {
    let suggestions = [
        'How busy is the library?'
    ]
    conv.ask(`Here are a few things you can ask:`)
    conv.ask(new Suggestions(suggestions))
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
app.intent('get_meta', (conv, params) => {
    return getMeta(conv, params)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)
