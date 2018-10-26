// const config = require('./config')
const https = require('https')
const {WebhookClient} = require('dialogflow-fulfillment')
const {Card, Suggestion} = require('dialogflow-fulfillment')
const functions = require('firebase-functions')
const httpsAgent = new https.Agent({rejectUnauthorized: false})
const fetch = require('isomorphic-fetch')
const config = requre('./config')


process.env.DEBUG = 'dialogflow:debug' // Debugging on Firebase


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response })
    const defaultErrorResponse = "Sorry, I wasn't able to get that info. Try back later."
    

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
        return fetch(url, { httpsAgent }).then((response) => {
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
    function getLibraryOccupancy(agent) {
        return fetchFromBrockApi('wifi').then((res) => {
            let requestedFloor = agent.parameters['libraryFloor'].toString()
            let floors = res['library']
            if (requestedFloor != '') {
                // Attempt to find the floor, otherwise continue
                for (var i = 0; i < floors.length; i++) {
                    if (floors[i]['floor'] == requestedFloor) {
                        let speech = 'Floor ' + floors[i]['floor']
                        speech += ' in the library is currently ' + floors[i]['status'].toLowerCase()
                        agent.add(speech)
                        return
                    }
                }
            }
            let speech = res['library'].map((floor) => {
                return " Floor " + floor['floor'] + " is " + floor['status'].toLowerCase()
            })
            agent.add(`Here's how all the library floors are looking right now.` + speech)
        }).catch((err) => {
            console.error('Unable to retrieve response: ' + err)
            agent.add(defaultErrorResponse)
        })
    }


    /** Handler for fufilling events request
     * 
     * @since 1.0.0
     * @param {*} agent 
     */
    function getEvents(agent) {
        
        agent.add(`Sorry, events are currently unavailable`)
        agent.add(new Card({
            title: `Title: this is a card title`,
            imageUrl: 'https://dialogflow.com/images/api_home_laptop.svg',
            text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
            buttonText: 'This is a button',
            buttonUrl: 'https://docs.dialogflow.com/'
          })
        );
        agent.add(new Suggestion(`Quick Reply`));
        agent.add(new Suggestion(`Suggestion`));
        agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
    }


    // Map Intents to Functions
    let intentMap = new Map()
    intentMap.set('get_library_occupancy', getLibraryOccupancy)
    intentMap.set('get_events', getEvents)
    agent.handleRequest(intentMap)

})
