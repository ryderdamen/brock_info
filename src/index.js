/** index.js
 * Main entrypoint for Brock University Fulfillment App
 */

 // Imports
const {dialogflow} = require('actions-on-google')
const functions = require('firebase-functions');
const app = dialogflow()
const getLibraryOccupancy = require('./library')
const getEvents = require('./events')
const {getFoodVenues, getFoodVenueDetails} = require('./food')
const {getClubs, getClubsDetails} = require('./clubs')


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
app.intent('get_clubs_details', (conv, params) => {
    return getClubsDetails(conv, params)
})


// Exports
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)
