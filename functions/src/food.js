/** food.js
 * Methods for building responses related to food venues
 */

const {Image, Carousel, BasicCard, Button} = require('actions-on-google')
const {fetchFromBrockApi} = require('./helpers')
const slugify = require('slugify')
const {defaultErrorResponse, defaultImageUrl} = require('./defaults')
const moment = require('moment-timezone')


/** Main handler for getting all food venues
 * 
 * @param {*} agent 
 * @param {*} params 
 */
module.exports.getFoodVenues = function(conv, params) {
    return fetchFromBrockApi('food').then((apiResponse => {
        var venues = apiResponse['food_venues']
        venues = venues.filter((venue) => {
            return venueIsOpen(venue)
        }).slice(0,10)
        if ( (venues === undefined || venues.length == 0) ) {
            conv.ask(`Sorry, it looks like there aren't any places to eat open right now. Try again later.`)
            return
        }

        // User doesn't have a screen, read all the food venues.
        if ( ! conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT') ) {
            let speech = `Here's a list of food venues on campus that are open right now. `
            let foodVenues = venues.map((venue) => {
                return venue['name'] + ' located in ' + venue['building_name'] + '.'
            })
            speech += foodVenues.join(` `)
            conv.ask(speech)
            return
        }

        // Display the venues on screen
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
        // let mapBaseUrl = "https://www.google.com/maps/@"
        let foundVenue = false
        allVenues.map((venue) => {
            if ( slugify(venue['name']) === selectedSlug ) {
                let descriptionText = `Today's hours: ` + getTodaysHours(venue) + `  \n`
                descriptionText += venue['description']
                conv.ask(`Here's some more info:`)
                conv.ask(new BasicCard({
                    text: descriptionText,
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
function getTodaysHours(venue, openOrClosed = false) {
    let currentWeekday = moment().tz("America/Toronto").format('dddd').toLowerCase()
    let openTime = venue['opening_hours'][currentWeekday + 'open']
    let closeTime = venue['opening_hours'][currentWeekday + 'close']
    // Account for isVenueOpen()
    if (openOrClosed !== false) {
        return [openTime, closeTime]
    }
    if (openTime == "" && closeTime == "") {
        return "Closed for today."
    }
    let todaysHours = openTime + ` - ` + closeTime
    if (venue['opening_hours']['specialmessage'] !== "") {
        todaysHours += venue['opening_hours']['specialmessage']
    }
    return todaysHours
}


/** Checks if a venue is open or not
 * 
 * @since 1.0.0
 * @param {*} venue 
 * @returns {boolean} True - venue is open
 */
function venueIsOpen(venue) {
    let hoursArray = getTodaysHours(venue, true)
    let openTime = hoursArray[0]
    let closeTime = hoursArray[1]
    if (openTime == "" || closeTime == "") {
        // Not enough data to determine if currently open
        return false
    }
    // Convert to moment objects and compare
    let now = moment.tz('America/Toronto')
    let open = moment.tz(openTime, 'HH:mm', 'America/Toronto')
    let close = moment.tz(closeTime, 'HH:mm', 'America/Toronto')
    return now.isBetween(open, close)
}
