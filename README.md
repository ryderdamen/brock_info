# Brock DialogFlow Fulfillment Agent
This agent is responsible for fulfilling webhooks sent to the Brock Dialogflow Agent.

## Installation
Installation requires node / npm, as well as the firebase commandline tool (and probably the gcloud CLI).

Once these dependencies are met, run the following to install all required packages:

```bash
make install
```

Next, rename sampleConfig to `config.js` and populate it with endpoints, keys, hosts, etc.

## Deployment
To Deploy to firebase functions, run the following command:

```
make deploy
```

## Responses
The following is a list of all responses the fulfillment currently supports, and any new features that should be added soon. All features that display on screen should have at least a minimal option for users without screens (google home devices most likely).

* Clubs
    * Capabilities
        * Screen
        * Speech
    * Features
        * Lists a count of all clubs, and allows a user to search for a club
        * If using google assistant, returns detailed information about a club
    * To Do
        * Return club specific events
* Library Occupancy
    * Capabilities
        * Screen
        * Speech
    * Features
        * Returns the occupancy of all the floors of the library
        * Allows a user to specify a specific floor
* Events
    * Capabilities
        * Screen
        * Speech
    * Features
        * Lists the 10 most current events happening
    * To Do
        * Pass in a date and retrieve the events happening on that date
        * New intent returning MIWSFPA specific events
* Food
    * Capabilities
        * Screen
        * Speech
    * Features
        * Returns a list of all food venues on campus
    * To Do
        * Return only open food venues on campus (new intent?)
        * Return opening hours for specific food venue

