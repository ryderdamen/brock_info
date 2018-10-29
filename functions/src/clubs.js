/** clubs.js
 * Methods for handling the retrieval of clubs, club details, searching clubs, and club events
 */

const {Image, Suggestions, List, BasicCard, Button} = require('actions-on-google')
const slugify = require('slugify')
const {fetchFromBrockApi, titleCase} = require('./helpers') 
const {defaultErrorResponse, defaultImageUrl} = require('./responses')


/** Handles retrieval of all clubs, and search of clubs
 * 
 * @param {*} conv 
 * @param {*} params 
 */
module.exports.getClubs = function(conv, params) {
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
module.exports.getClubsDetails = function(conv, params) {
    return fetchFromBrockApi('clubs').then((apiResponse => {
        var allClubs = apiResponse['clubs']
        let selectedSlug = conv.arguments.get('OPTION')
        let foundClub = false
        allClubs.map((club) => {
            if ( slugify(club['name']) === selectedSlug ) {
                conv.ask(`Here's what I know about ` + club['name'] + `:`)
                conv.ask(new BasicCard({
                    text: club['description'],
                    title: club['name'],
                    buttons: [
                        new Button({
                            title: 'More Info',
                            url: club['exbu_profile'] || 'https://brocku.ca'
                        })
                    ],
                    image: new Image({
                        url: club['profile_photo'],
                        alt: 'Photo of ' + club['name'],
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
module.exports.getClubEvents = function(conv, params) {

}
