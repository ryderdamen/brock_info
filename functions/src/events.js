/** Methods for handling retrieval of events
 * 
 */

const {Image, BrowseCarousel, BrowseCarouselItem} = require('actions-on-google')
const fetchFromBrockApi = require('./helpers')
const {defaultErrorResponse, defaultImageUrl} = require('./responses')
const moment = require('moment');



/** Retrieves all current events
 * 
 * @param {*} agent
 * @param {*} params
 */
module.exports.getEvents = function(conv, params) {
    return fetchFromBrockApi('all-events').then((apiResponse => {
    
        // Most recent 10 events
        var events = apiResponse['events'].slice(0,10)
    
        // User doesn't have a screen, read the events.
        if ( ! conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT') ) {
            let speech = 'Here are the most recent 10 events. Visit Experience BU for more information. '
            let speechEvents = events.map((event) => {
                return event['event_name'] + ' happening ' + moment(event['start_datetime']).calendar() + '. '
            })
            speech += speechEvents
            conv.ask(speech)
            return
        }

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
