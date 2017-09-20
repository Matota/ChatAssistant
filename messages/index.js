"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');
var mongo = require('mongodb').MongoClient;
var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector, function (session) {
	session.send('Sorry, I didn\'t understand \'%s\'.', session.message.text);
	session.beginDialog('/callsupport');
});

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

//const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b2cb429c-dcb6-45c2-86b8-2b8c5f54daae?subscription-key=4c1fb153e77e4323b03fffc2d3f1f0b9&verbose=true&timezoneOffset=0&spellCheck=true&q=');
bot.recognizer(recognizer);

/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/


bot.use({
	receive: function(event, next) {
		console.log('receive message ' + event.text );
		mongo.connect('mongodb://vijith123:test123@ds036967.mlab.com:36967/vijith_auth', function (err, db) {
            if(err){
                console.warn(err.message);
            } else if (event.text){
					var collection = db.collection('nlp_chat');
					var data = 'User : ' + event.text ;
					collection.insert({ content: data }, function (err, o) {
						if (err) { console.warn(err.message); }
						else { console.log("chat message inserted into db: " + data); }
					});
            }
        });
		next();
	},
	send : function(event, next) {
		console.log('send message ' + event.text );
		mongo.connect('mongodb://vijith123:test123@ds036967.mlab.com:36967/vijith_auth', function (err, db) {
            if(err){
                console.warn(err.message);
            } else if (event.text){
					var collection = db.collection('nlp_chat');
					var data = 'Hum Assistant : ' + event.text ;
					collection.insert({ content: data }, function (err, o) {
						if (err) { console.warn(err.message); }
						else { console.log("chat message inserted into db: " + data); }
					});
            }
        });
		next();
	}
})
  
var DialogLabels = {
    signup: 'Sign Up',
    features: 'Hum Features',
    support: 'Store Locator',
    compatible: 'Vehice Compatibility',
    works: 'Get to know how hum works!',
    team: 'Meet the team!'
};
bot.dialog('/callsupport', [
    function (session, args) {
		var card = createSupportCard(session);
        var msg = new builder.Message(session).addAttachment(card);
		session.send('Sorry that I couldn\'t answer your query.');
        setTimeout(function(){ session.send(msg); }, 2000);
 -      setTimeout(function(){ session.endDialog('Click the button above and we will redirect you to the support team :)'); }, 4000);
 -      setTimeout(function(){ session.send('Here is your unique transaction ID ' + Math.floor((Math.random() * 9999293) + 1)+ '.'); }, 6000);
		
},
 function (session, results) {

}
]).triggerAction({
   matches: 'callsupport'
});

function createSupportCard(session) {
    return new builder.SigninCard(session)
        .text('Here to help!')
        .button('Call Customer support', 'https://www.google.com');
}

bot.dialog('/Greetings', [

    function (session, args, next) {
        // prompt for search option
        builder.Prompts.choice(
            session,
            'Hey! This is Hum Assistant. How can I help you?',
            [DialogLabels.signup, DialogLabels.features, DialogLabels.support, DialogLabels.compatible, DialogLabels.works, DialogLabels.team],
            {
                maxRetries: 5,
                retryPrompt: 'Not a valid option'
            });
    },
    function (session, result) {
        if (!result.response) {

            session.send('Ooops! Too many attemps :( But don\'t worry, you can try again!');
            return session.endDialog();
        }

        // on error, start over
        session.on('error', function (err) {
            session.send('Ooops! I don\'t think I can help you with that :( But don\'t worry, you can try again!');
            session.endDialog();
        });

        // continue on proper dialog
        var selection = result.response.entity;
        switch (selection) {
            case DialogLabels.signup:
                return session.beginDialog('/signup');
            case DialogLabels.features:
                return session.beginDialog('/features');
            case DialogLabels.support:
                return session.beginDialog('/locate');
            case DialogLabels.compatible:
                return session.beginDialog('/compat');
            case DialogLabels.works:
                return session.beginDialog('/work');
            case DialogLabels.team:
                return session.beginDialog('/creators');
        }
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
        session.send(msg);
        session.endDialog('Here you Go!');
    }
]).triggerAction({
   matches: 'ShowBill'
});

bot.dialog('/Help', [

    function (session, args, next) {
        // prompt for search option
        builder.Prompts.choice(
            session,
            'Hey how can I help you?',
            [DialogLabels.signup, DialogLabels.features, DialogLabels.support, DialogLabels.compatible, DialogLabels.works],
            {
                maxRetries: 5,
                retryPrompt: 'Not a valid option'
            });
    },
    function (session, result) {
        if (!result.response) {

            session.send('Ooops! Too many attemps :( But don\'t worry, you can try again!');
            return session.endDialog();
        }

        // on error, start over
        session.on('error', function (err) {
            session.send('Ooops! I don\'t think I can help you with that :( But don\'t worry, you can try again!');
            session.endDialog();
        });

        // continue on proper dialog
        var selection = result.response.entity;
        switch (selection) {
            case DialogLabels.signup:
                return session.beginDialog('/signup');
            case DialogLabels.features:
                return session.beginDialog('/features');
            case DialogLabels.support:
                return session.beginDialog('/locate');
            case DialogLabels.compatible:
                return session.beginDialog('/compat');
            case DialogLabels.works:
                return session.beginDialog('/work');
        }
    }
]).triggerAction({
    matches: 'Help'
});


 

var order = 927302;
function createReceiptCard(session) {
    return new builder.ReceiptCard(session)
        .title('Hum subscription charges.')
        .facts([
            builder.Fact.create(session, order++, 'Order Number'),
            builder.Fact.create(session, 'VISA 4102-****-**76', 'Payment Method')
        ])
        .items([
            builder.ReceiptItem.create(session, '$ 10.99', 'Monthly Subscription')
                .quantity(368)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png')),
            builder.ReceiptItem.create(session, '$ 0.00', 'Equipment charge')
                .quantity(720)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
        ])
        .tax('$ 1.25')
        .total('$ 12.24')
        .buttons([
            builder.CardAction.openUrl(session, 'https://shopping.hum.com', 'More Information')
                .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
        ]);
}


function validateMonth(month) {
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
    session.endDialog('There are plenty of other features! Check them out by clicking "Learn more" above');
        
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

//map store location 

bot.dialog('/locate', [
    function (session, args) {
        if(args) {
            var intent = args.intent;
            var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
            if(cityEntity) {
                var message = 'Looking for Verizon stores near %s!';
                session.send(message, cityEntity.entity);
                var card = createMapcard(session, cityEntity.entity);
                var msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog('Here is the location nearest to you.');
            } else {
                builder.Prompts.text(session, 'Please enter the location to find the stores!');
            }
        } else {
            builder.Prompts.text(session, 'Please enter the location to find the stores!');
        }
           
},
 function (session, results) {
    var city = results.response;
    var message = 'Looking for Verizon stores near %s!';
    session.send(message, city);
    var card = createMapcard(session, city);
    var msg = new builder.Message(session).addAttachment(card);
    session.send(msg);
    session.endDialog('Hope that helps :D');
}
]).triggerAction({
   matches: 'locate'
});

function createMapcard(session, city) {
    return new builder.HeroCard(session)
        .title('Store Location')
        .subtitle('')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://www.mapquestapi.com/staticmap/v4/getplacemap?key=ezuyhAKQ1v0y6i2AUYXndRjkFagn07Bn&location='+city+'&size=500,280&zoom=9&showicon=red_1-1')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.mapquest.com/search/results?layer=shopping&query='+city+'&boundingBox=47.100044694025215,-121.11328124999999,28.729130483430154,-74.8828125&page=0', 'More locations.')
        ]);
}

//others
//work
//hum

bot.dialog('/work', [
    function (session, args) {
    var cards = getWorksCard();

    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);

    session.send(reply);
    session.endDialog('Hope that answered your question :D');
        
},
 function (session, results) {

}
]).triggerAction({
   matches: 'work'
});

function getWorksCard(session) {
    return [
        new builder.HeroCard(session)
            .title('How it works!')
            .subtitle('')
            .text('After activating your account, just plug the OBD device into the OBD-II port in your car and access Hum features on your phone.')
            .images([
                builder.CardImage.create(session, 'http://unified-mobile.com/wp-content/uploads/2016/03/Hum-3.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/products', 'Learn More')
            ]),
        new builder.HeroCard(session)
            .title('Mobile App and Portal.')
            .subtitle('')
            .text('Download the Hum app and create your account.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/promo/how-3.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/products', 'Learn More')
            ]),
        new builder.HeroCard(session)
            .title('Hum Speaker.')
            .subtitle('Near or far, Hum helps locate your car')
            .text(' Clip the Hum speaker to your visor.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/promo/how-2.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/products', 'Learn More')
            ]),

        new builder.HeroCard(session)
            .title('OBD Device.')
            .subtitle('Plug the OBD Reader into your car\'s OBD-II port.')
            .text('Located under the steering wheel of most vehicles made after 1996.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/promo/how-1.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/products', 'Learn More')
            ])
    ];
}

bot.dialog('/signup', [
    function (session, args) {
        var card = createSigninCard(session);
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.endDialog('Create an account from the above link and you should be good to go :)');
},
 function (session, results) {

}
]).triggerAction({
   matches: 'signup'
});

function createSigninCard(session) {
    return new builder.SigninCard(session)
        .text('Hum sign in card')
        .button('Sign-in', 'https://customer.hum.com');
}

//vehicle incomaptible

bot.dialog('/compat', [
    function (session, args) {
        builder.Prompts.text(session, 'Hey tell me your car make!');
    },
    function (session, results) {
        session.userData.make = results.response.toUpperCase();
        builder.Prompts.text(session, 'Let me know your ' + session.userData.make+'\'s'+' model!');
    },
    function (session, results) {
        session.userData.model = results.response.toUpperCase();
        builder.Prompts.number(session, 'Tell me your ' + session.userData.make+' '+session.userData.model+'\'s'+' year of manufacture!');
    },
    function (session, results) {
        var card,msg;
        session.userData.year = results.response;
        session.send('Checking if your car with make ' + session.userData.make +', model ' + session.userData.model +
            ' and year ' + session.userData.year + ' is compatible with Hum...');
        request.get('https://www.hum.com/bin/core/compatibility.json?year='+session.userData.year+'&make='+ session.userData.make +'&model='+session.userData.model+'',function(err,res,body){
            var test = JSON.parse(body);
            console.log(test.response.responseCode);
            if(err) {
                card = compatibleMapcard(session, false);
                msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog('To know more click the link above!');
            }
            if(test.response.responseCode === 2000 ) {
                card = compatibleMapcard(session, true);
                msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog('To know more click the link above!');
            } else {
                card = compatibleMapcard(session, false);
                msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog('To know more click the link above!');
            }

        });
    }
    
]).triggerAction({
   matches: 'compat'
});

function compatibleMapcard(session, status) {
    if(status) {
        var text = 'Compatible :)';
        var checkTest = 'Your vehicle is Hum compatible!';
        var image = 'http://www.clipartkid.com/images/2/thumbs-up-happy-smiley-emoticon-clipart-royalty-free-UVUNH6-clipart.png';
    }else {
        var text = 'Incompatible :(';
        var checkTest = 'Unfortunately, your vehicle is not supported at this time.';
        var image = 'http://clipart-library.com/images/yTkr9EaGc.png';
        
    }
    return new builder.HeroCard(session)
        .title(text)
        .subtitle('')
        .text(checkTest)
        .images([
            builder.CardImage.create(session, image)
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://customer.hum.com/activation/checkmycar.html', 'More Information')
        ]);
}
//creators.
bot.dialog('/creators', [
    function (session, args) {
        var cards = getCreatorsCard();

    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);

    session.send(reply);
    session.endDialog('Hey I am one of the best Artificial intelligence created! Thank my creators :D');
},
 function (session, results) {

}
]).triggerAction({
   matches: 'creators'
});

bot.dialog('/problem', [
    function (session, args) {
		var cards = getWorksCard();

    // create reply with Carousel AttachmentLayout
		var reply = new builder.Message(session)
			.attachmentLayout(builder.AttachmentLayout.carousel)
			.attachments(cards);

			session.send(reply);
			setTimeout(function(){ builder.Prompts.text(session, 'Have you tried to follow the steps mentioned in the above links?'); }, 3000);

},
 function (session, results) {
     var replyFromUser = results.response.toLowerCase();
	if (replyFromUser.indexOf('yes') > -1) {
		var message = 'Let me check HUM system to analyze your problem! Give me a moment :)';	
		session.send(message);
				request.post('http://private-3f7ac-vijith.apiary-mock.com/HTIWebGateway/vv/rest/AccountStatusManagement/V3/get/accountandvehicleinfo',
				{ dataArea: { userId: '1-H2JUW' } },
				function (error, response, body) {
					if (!error && response.statusCode == 200) {;
						var test = JSON.parse(body);
						if (test.dataArea){
							var data = test.dataArea.accountList[0].vehicleList[0].vinStatus;
						}
						if(data === 'unknown'){
							var card = errorCard(session);
							var msg = new builder.Message(session).addAttachment(card);
							setTimeout(function(){ session.send('The OBD device is not connected to the OBD port II!'); }, 8000);
							setTimeout(function(){ session.send(msg); }, 10000);
							setTimeout(function(){ session.endDialog('Please install the device properly and you should be good to go! :D'); }, 12000);
						} else if ( data === 'incompatible') {
							var card = compatibleMapcard(session, false);
							var msg = new builder.Message(session).addAttachment(card);
							setTimeout(function(){ session.send('Hum Device is not compatible with your car :('); }, 8000);
							setTimeout(function(){ session.send(msg); }, 10000);
							setTimeout(function(){ session.endDialog('Please check with our support team or follow the link in the above message to know more!'); }, 12000);
						}
					}
				});
        
	} else {
		var message = 'Please follow the steps mentioned in the above links and you shouldn\'t have any issues! :D';	
		 session.endDialog(message);
	}
        
    }
]).triggerAction({
   matches: 'problem'
});

function errorCard(session) {
		return new builder.HeroCard(session)
            .title('OBD Device Issue found.')
            .subtitle('Seems like the OBD device is not properly connected to the OBD port')
            .text('The OBD port II is located under the steering wheel of most vehicles made after 1996.')
            .images([
                builder.CardImage.create(session, 'https://www.hum.com/content/dam/hum/promo/how-1.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.hum.com/products', 'OBD issues FAQ')
            ]);
}

function getCreatorsCard(session) {
    return [
        new builder.HeroCard(session)
            .title('Prashanth Nagaraj')
            .subtitle('Principal Engineer, IOT Telematics at Verizon')
            .text('Software designer and product developer having experience of over 14 years in digital consumer and networking domain.')
            .images([
                builder.CardImage.create(session, 'https://media.licdn.com/mpr/mpr/shrinknp_200_200/AAEAAQAAAAAAAAO7AAAAJDMyMDY3NjA0LWM1ODAtNDVjNC04YmUxLTJjNGU2NWE5YzUyZg.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.linkedin.com/in/prashanth-nagaraj-2108197b/', 'Know more about Prashanth')
            ]),
        new builder.HeroCard(session)
            .title('Vijith Vishnu')
            .subtitle('Senior PD engineer I at Verizon Telematics Inc.')
            .text('A full-stack software engineer, with sound knowledge of front-end and back-end programming along with database interactions.')
            .images([
                builder.CardImage.create(session, 'https://media.licdn.com/mpr/mpr/shrinknp_200_200/AAEAAQAAAAAAAAhCAAAAJDA3NTgyOGY3LTM2N2UtNDFjYS1iMzMyLWVhNjNmYTI0MjE2Mg.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.linkedin.com/in/vijith-v-538b39a1/', 'Know more about Vijith')
            ]),
        new builder.HeroCard(session)
            .title('Hitesh Ahuja')
            .subtitle('PD engineer II at Verizon Telematics Inc.')
            .text('An IT professional with around 4 years experience in mobile business applications design and development.')
            .images([
                builder.CardImage.create(session, 'https://media.licdn.com/mpr/mpr/shrinknp_200_200/AAEAAQAAAAAAAAieAAAAJDMzMWY3ODBjLTBkM2UtNDdjNC1iNTAyLTI1MTEyN2U5MGVhNQ.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.linkedin.com/in/hitesh-ahuja90/', 'Know more about Hitesh')
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