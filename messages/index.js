"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector, [
    function (session) {
        builder.Prompts.choice(session, 'What card would like to test?', CardNames, {
            maxRetries: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
    },
    function (session, results) {

        // create the card based on selection
        var selectedCardName = results.response.entity;
        var card = createCard(selectedCardName, session);

        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }
]);

var HeroCardName = 'Hero card';
var ThumbnailCardName = 'Thumbnail card';
var ReceiptCardName = 'Receipt card';
var SigninCardName = 'Sign-in card';
var AnimationCardName = "Animation card";
var VideoCardName = "Video card";
var AudioCardName = "Audio card";
var CardNames = [HeroCardName, ThumbnailCardName, ReceiptCardName, SigninCardName, AnimationCardName, VideoCardName, AudioCardName];

function createCard(selectedCardName, session) {
    switch (selectedCardName) {
        case HeroCardName:
            return createHeroCard(session);
        case ThumbnailCardName:
            return createThumbnailCard(session);
        case ReceiptCardName:
            return createReceiptCard(session);
        case SigninCardName:
            return createSigninCard(session);
        case AnimationCardName:
            return createAnimationCard(session);
        case VideoCardName:
            return createVideoCard(session);
        case AudioCardName:
            return createAudioCard(session);
        default:
            return createHeroCard(session);
    }
}

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

//const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/54347466-9e43-41b8-9ebc-09bab74b36f6?subscription-key=e848884cd17a41a78879b6932ecc884a&verbose=true&q=');
bot.recognizer(recognizer);
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
  
bot.dialog('/Greetings', [
    function (session, args, next) {
        var intent = args.intent;
        console.log(intent);
        session.send('Hey! This is Hum Assistant. Please tell me how can I help you?');
        session.endDialog();

        
    },
    function (session, results) {
        session.send('Whats Up Bro?');
      
    }
]).triggerAction({
    matches: 'Greetings',

});

bot.dialog('/ShowBill', [
    function (session, args) {
        var intent = args.intent;
        var monthEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'month');
        if(monthEntity) {
            var value = validateMonth(monthEntity.entity);
            if(value) {
                var card = createReceiptCard(session, monthEntity.entity);
                var msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog('Here you Go!');
            } else {
                builder.Prompts.text(session, 'Invalid entry! Please enter a valid month.');
            }
            
        }else {
            builder.Prompts.text(session, 'Please enter the month for which you need the bill!');
        }
},
 function (session, results) {
    var month = results.response;
        var message = 'Looking for bills for the month of %s!';
        session.send(message, month);
        var card = createReceiptCard(session, month);
        var msg = new builder.Message(session).addAttachment(card);
        setTimeout(function(){ session.send(msg); }, 5000);
        setTimeout(function(){ session.endDialog('Here you Go!'); }, 6000);
    }
]).triggerAction({
   matches: 'ShowBill'
});

bot.dialog('/Help', function (session) {
    session.endDialog('hey what can i help you with?');
}).triggerAction({
    matches: 'Help'
});


 

var order = 927302;
function createReceiptCard(session) {
    return new builder.ReceiptCard(session)
        .title('John Doe')
        .facts([
            builder.Fact.create(session, order++, 'Order Number'),
            builder.Fact.create(session, 'VISA 5555-****', 'Payment Method')
        ])
        .items([
            builder.ReceiptItem.create(session, '$ 38.45', 'Bill Amount')
                .quantity(368)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png')),
            builder.ReceiptItem.create(session, '$ 45.00', 'Previous Bill Amount')
                .quantity(720)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
        ])
        .tax('$ 7.50')
        .total('$ 90.95')
        .buttons([
            builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
                .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
        ]);
}


function validateMonth(month) {
    console.log('entering validateMonth');
    console.log(month);
    var monthArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    if (monthArray.indexOf(month.toLowerCase()) > -1) {
        return true;
    } else {
        return false;
    }
}

// show me hum and hum product information with images
//hum.com

bot.dialog('/intro', [
    function (session, args) {
        var card = createVideoCard(session);
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        setTimeout(function(){ session.endDialog('Hope that helped :D'); }, 3000);
},
 function (session, results) {

}
]).triggerAction({
   matches: 'intro'
});

function createVideoCard(session) {
    return new builder.VideoCard(session)
        .title('HUM')
        .subtitle('by Verizon')
        .text('When it comes to your car, you can never know too much. Thats why theres Hum. Hum equips you with the tools and know-how to help you drive smarter, safer and more connected.')
        .image(builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/pricing/fpo-13.png'))
        .media([
            { url: 'https://www.hum.com/content/dam/hum/video/RKN_Verizon_Hum_optimized.mp4' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.hum.com/features', 'Learn More')
        ]);
}

bot.dialog('/thank', [
    function (session, args) {
        session.endDialog('You are welcome!');
},
 function (session, results) {

}
]).triggerAction({
   matches: 'thank'
});


bot.dialog('/features', [
    function (session, args) {
    var cards = getCardsAttachments();

    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);

    session.send(reply);
        
},
 function (session, results) {

}
]).triggerAction({
   matches: 'feature'
});


function getCardsAttachments(session) {
    return [
        new builder.HeroCard(session)
            .title('Driving History')
            .subtitle('Near or far, Hum helps locate your car')
            .text('Hum\'s location features make it the ultimate car-sitter. Can\'t remember where you parked? Hum will show you. Want to monitor how fast you\'ve gone, and how far you and your family have driven? Hum does that, too. Wherever your car goes, Hum knows.')
            .images([
                builder.CardImage.create(session, 'https://scache.vzw.com/kb/images/verizon_wireless/hum/driving_history_web_main.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/features', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('Boundary alert')
            .subtitle('Want to monitor how fast you\'ve gone, and how far you and your family have driven? Hum does that, too. Wherever your car goes, Hum knows.')
            .text('Hum\'s location features make it the ultimate car-sitter. Can\'t remember where you parked? Hum will show you. Want to monitor how fast you\'ve gone, and how far you and your family have driven? Hum does that, too. Wherever your car goes, Hum knows.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/animation/fpo-phonescreen-5.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/features', 'Learn More')
            ]),

        new builder.HeroCard(session)
            .title('Speed alert')
            .subtitle('Want to check if your family members are driving at safe speeds on Road?')
            .text('Hum\'s location features make it the ultimate car-sitter. Can\'t remember where you parked? Hum will show you. Want to monitor how fast you\'ve gone, and how far you and your family have driven? Hum does that, too. Wherever your car goes, Hum knows.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/animation/fpo-phonescreen-3.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/features', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('Roadside assistance')
            .subtitle('Hum to the rescue!')
            .text('There you are. Stranded. Miles away from civilization. Moments away from losing your mind. Then you remember, "Oh yeah. I have Hum." One button push and Hum will help you get back on the road')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/animation/fpo-phonescreen-4.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/features', 'Learn More')
            ])
    ];
}


//emulator settings
if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    console.log('yeee');
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}