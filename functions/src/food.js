/** food.js
 * Methods for building responses related to food venues
 */

const {Image, Carousel, BasicCard, Button} = require('actions-on-google')
const {fetchFromBrockApi} = require('./helpers')
const slugify = require('slugify')
const {defaultErrorResponse, defaultImageUrl} = require('./responses')
const moment = require('moment')


/** Main handler for getting all food venues
 * 
 * @param {*} agent 
 * @param {*} params 
 */
module.exports.getFoodVenues = function(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        // Most recent 10 events
        var venues = apiResponse['food_venues'].slice(0,10)

        // User doesn't have a screen, read all the food venues.
        if ( ! conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT') ) {
            let speech = 'Here is a list of food venues on campus. '
            let foodVenues = apiResponse['food_venues'].map((venue) => {
                return venue['name'] + ' located in ' + venue['building_name'] + '. '
            })
            speech += foodVenues
            conv.ask(speech)
            return
        }

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
module.exports.getFoodVenueDetails = function(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        // Most recent 10 events
        var allVenues = apiResponse['food_venues']
        let selectedSlug = conv.arguments.get('OPTION')
        console.error('selected slub is ' + selectedSlug)
        let mapBaseUrl = "https://www.google.com/maps/@"
        let foundVenue = false
        allVenues.map((venue) => {
            if ( slugify(venue['name']) === selectedSlug ) {
                let descriptionText = `Today's hours: ` + getTodaysHours(venue)
                descriptionText += venue['description']
                conv.ask(`Here's some more info:`)
                conv.ask(new BasicCard({
                    text: venue['description'],
                    subtitle: venue['building_name'] + ` (Floor ` + venue['floor_number'] + `)`,
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



/** Gets the current day's hours for the particular venue
 * 
 * @param {*} venue 
 */
function getTodaysHours(venue) {
    let currentWeekday = moment(mydate).format('dddd').toLowerCase()
    let openTime = venue['opening_hours'][currentWeekday + 'open']
    let closeTime = venue['opening_hours'][currentWeekday + 'close']
    let todaysHours = openTime + ` - ` + closeTime
    if (venue['opening_hours']['specialmessage'] !== "") {
        todaysHours += venue['opening_hours']['specialmessage']
    }
    return todaysHours
}