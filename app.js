/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// Create your bot with a function to receive messages from the user
var bot = module.exports = new builder.UniversalBot(connector, [
    // this section becomes the root dialog
    // If a conversation hasn't been started, and the message
    // sent by the user doesn't match a pattern, the
    // conversation will start here
    (session, args, next) => {
        session.send(`Hi there! I'm VetBot. Let's talk about your visit.`);

        // Launch the getFarm dialog using beginDialog
        // When beginDialog completes, control will be passed
        // to the next function in the waterfall
        session.beginDialog('getFarm');
    },
    (session, results, next) => {
        // executed when getFarm dialog completes
        // results parameter contains the object passed into endDialogWithResults

        // check for a response
        if (results.response) {
            var farm = session.privateConversationData.farm = results.response;

            // When calling another dialog, you can pass arguments in the second parameter
            session.beginDialog('getVisitReason', { farm: farm });
        } else {
            // no valid response received - End the conversation
            session.endConversation(`Sorry, I didn't understand the response. Let's start over.`);
        }
    },

    (session, results, next) => {
        // executed when getVisitReason dialog completes
        // results parameter contains the object passed into endDialogWithResults

        // check for a response
        if (results.response) {
            var visitReason = session.privateConversationData.visitReason = results.response;
            // When calling another dialog, you can pass arguments in the second parameter
            session.beginDialog('getAnimalType');
        } else {
            // no valid response received - End the conversation
            session.endConversation(`Sorry, I didn't understand the response. Let's start over.`);
        }
    },



    (session, results, next) => {
        // executed when getAnimalType dialog completes
        // results parameter contains the object passed into endDialogWithResults

        // check for a response
        if (results.response) {
            var animalType = session.privateConversationData.animalType = results.response;
            var visitReason = session.privateConversationData.visitReason;
            var farm = session.privateConversationData.farm;
            session.endConversation(`You visited ${farm} because of a ${visitReason} on animal type ${animalType}`);
        } else {
            // no valid response received - End the conversation
            session.endConversation(`Sorry, I didn't understand the response. Let's start over.`);
        }
    },
]);

bot.dialog('getFarm', [
    (session, args, next) => {
        // store reprompt flag
        if(args) {
            session.dialogData.isReprompt = args.isReprompt;
        }

        // prompt user
        builder.Prompts.text(session, 'What farm did you visit?');
    },
    (session, results, next) => {
        var farm = results.response;

        if (!farm || farm.trim().length < 3) {
            // Bad response. Logic for single re-prompt
            if (session.dialogData.isReprompt) {
                // Re-prompt ocurred
                // Send back empty string
                session.endDialogWithResult({ response: '' });
            } else {
                // Set the flag
                session.send('Sorry, farm must be at least 3 characters.');

                // Call replaceDialog to start the dialog over
                // This will replace the active dialog on the stack
                // Send a flag to ensure we only reprompt once
                session.replaceDialog('getName', { isReprompt: true });
            }
        } else {
            // Valid farm received
            // Return control to calling dialog
            // Pass the farm in the response property of results
            session.endDialogWithResult({ response: farm.trim() });
        }
    }
]);

bot.dialog('getVisitReason', [
    (session, args, next) => {
        var farm = session.dialogData.farm = 'User';

        if (args) {
            // store reprompt flag
            session.dialogData.isReprompt = args.isReprompt;

            // retrieve name
            farm = session.dialogData.farm = args.farm;
        }

        var ReasonLabels = {
            CQA: 'CQA',
            DxInv: 'Disease Investigation',
            HHC: 'Herd Health Check',
            Phone : 'Phone Call'
        };

        // prompt user

        builder.Prompts.choice(
            session,
            `Why did you visit ${farm}?`,
            [ReasonLabels.CQA, ReasonLabels.DxInv, ReasonLabels.HHC, ReasonLabels.Phone],
            {
                maxRetries: 3,
                retryPrompt: 'Not a valid option'
            });

    },
    (session, results, next) => {
        var visitReason = results.response.entity;


        // Valid visitReason received
        // Return control to calling dialog
         // Pass the visitReason in the response property of results
         session.endDialogWithResult({ response: visitReason.trim() });
        
    }
]);

bot.dialog('getAnimalType', [
    (session, args, next) => {
        var farm = session.dialogData.farm = 'User';

        if (args) {
            // store reprompt flag
            session.dialogData.isReprompt = args.isReprompt;

            // retrieve name
            farm = session.dialogData.farm = args.farm;
        }

        var AnimalLabel = {
            Sows: 'Sows',
            Boars: 'Boars',
            Piglets: 'Piglets',
            Nursery : 'Nursery'
        };

        // prompt user

        builder.Prompts.choice(
            session,
            `What animal type did you inspect?`,
            AnimalLabel,
            {
                maxRetries: 3,
                retryPrompt: 'Not a valid option'
            });

    },
    (session, results, next) => {
        var animalType = results.response.entity;


        // Valid animalType received
        // Return control to calling dialog
         // Pass the aniumaltype in the response property of results
         session.endDialogWithResult({ response: animalType.trim() });
        
    }
]);