/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * This simple sample is loosely based on the 'Space Geek' example provided by Amazon, though all of the original functionality has been gutted from the file.
 */

/**
 * App ID for the skill -- REPLACE WITH YOUR OWN APP ID
 */
var APP_ID = ""; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";


/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
var storage = require('./DBStorage');

var myStorage = new storage();
var gameState=null;
var newGameState={
    currentLetter: '',
    possibleLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    failedGuesses: '',
    successfulGuesses: '',
    tries: 0,
    score: 0
};
myStorage.setDefaultGameState(newGameState);

var currentLetter = '';
var phoneticAlphabet = { A: "alpha", B: "bravo", C: "charlie", D: "delta", E: 'echo', F: 'foxtrot', G: 'golf', H: 'hotel', I: 'india', J: 'juliett', K: 'kilo', L: 'lima', M: 'mike', N: 'november', O: 'oscar', P: 'papa', Q: 'quebec', R: 'romeo', S: 'sierra', T: 'tango', U: 'uniform', V: 'victor', W: 'whiskey', X: "x-ray", Y: "yankee", Z: "zulu"};
var scorePoints = { A: 100, B: 100, C: 100, D: 200, E: 200, F: 200, G: 400, H: 800, I: 800, J: 800, K: 400, L: 800, M: 400, N: 400, O: 400, P: 400, Q: 800, R: 800, S: 400, T: 200, U: 400, V: 400, W: 200, X: 200, Y: 400, Z: 400};
var scoreModifiers = [1,0.5,0.25,0,0,0];
var possibleLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var outPrompt='';
var guessedWord='';
var spokenLetterInput='';
var successfulGuesses='';
var failedGuesses='';
var score=0;
var tries=0;

/**
 * AlphaBravoCharlie is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var AlphaBravoCharlie = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
AlphaBravoCharlie.prototype = Object.create(AlexaSkill.prototype);
AlphaBravoCharlie.prototype.constructor = AlphaBravoCharlie;

AlphaBravoCharlie.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("AlphaBravoCharlie onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

AlphaBravoCharlie.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("AlphaBravoCharlie onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    //handleNewFactRequest(response);
    handleNewGameRequest(session, response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
AlphaBravoCharlie.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("AlphaBravoCharlie onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

AlphaBravoCharlie.prototype.intentHandlers = {
 
    "NewGameIntent": function (intent, session, response) {
        handleNewGameRequest(session, response);
    },
    //    myStorage.loadFromDB(session,newGameState, function(gS) {
    //        gameState=gS;           
    //        if (session.restoreFromDB !== undefined) {
    //            outPrompt="Welcome back to Alpha Bravo Charlie, the game that tests your knowledge of the phonetic alphabet used by NATO and aviation professionals around the world. We're starting from a previously saved game, please let me know if you want to start over instead. ";
    //            if (gameState.currentLetter !="") {
    //                gameState.possibleLetters=gameState.currentLetter+gameState.possibleLetters;
    //                //outPrompt=outPrompt+"Found possible letter "+gameState.currentLetter+". ";
    //            }
    //        } else {
    //            outPrompt='Welcome to Alpha Bravo Charlie, the word game that tests your knowledge of the phonetic alphabet used by NATO and aviation professionals around the world. Lets begin! ';
    //        }
    //        myStorage.writeGameStateToSession(session,gameState);
    //        possibleLetters=gameState.possibleLetters;
    //        handleNextLetter(session,response);
    //    });
    //},

    "StartOverIntent": function (intent, session, response) {
        gameState=newGameState;
        myStorage.writeGameStateToSession(session,gameState);
        outPrompt="Sure thing! Lets start a fresh game of Alpha Bravo Charlie. Let's begin! ";
        possibleLetters=gameState.possibleLetters;
        handleNextLetter(session,response);
    },

    "WhatIsMyScoreIntent": function (intent, session, response) {
        myStorage.extractGameStateFromSession(session, function(gameState) {
            myStorage.loadFromDB(session,gameState, function(gS) {
                gameState=gS;
                myStorage.writeGameStateToSession(session,gameState);
                var scoredValue=scorePoints[gameState.currentLetter]*scoreModifiers[session.attributes.tries];
                outPrompt="Your current score is "+gameState.score.toString()+". Let's keep going! ";
                var speechOutput = "<speak>"+outPrompt+"For "+scoredValue.toString()+" points, tell me the phonetic alphabet word for the letter "+gameState.currentLetter+"</speak>";
                var outputSpeechJSON = { 
                        "speech": speechOutput,
                        "type": "SSML"
                };

                response.askWithCard( outputSpeechJSON, "Alpha Bravo Charlie",speechOutput);
            });
        });
    },

    "GuessIntent": function (intent, session, response) {
        myStorage.extractGameStateFromSession(session, function(gameState) {
            myStorage.loadFromDB(session,gameState, function(gS) {
                gameState=gS;
                myStorage.writeGameStateToSession(session,gameState);
                if (intent.slots.letter.value == undefined) {
                    spokenLetterInput = session.attributes.currentLetter;
                } else {
                    spokenLetterInput = intent.slots.letter.value;
                //spokenLetterInput = 'booja';

                // TO DO: check to see if the letter matches the session.
                }
                if (intent.slots.word == '') {
                    // Not sure how this happens, but we need to handle it gracefully
                    handleInputErrorResponse(response);
                } else {
                    guessedWord = intent.slots.word.value.toLowerCase();
                    handleGuessedWord(session, response);
                }
            });
        });
    },

    "SkipIntent": function (intent, session, response) {
        myStorage.extractGameStateFromSession(session, function(gameState) {
            myStorage.loadFromDB(session,gameState, function(gS) {
                gameState=gS;
                myStorage.writeGameStateToSession(session,gameState);
                if (session.attributes.possibleLetters != null) {
                    possibleLetters = session.attributes.possibleLetters;
                }
                // check to see if there are any letters left
                outPrompt='No problem. The correct answer for the letter '+gameState.currentLetter+" is "+phoneticAlphabet[gameState.currentLetter]+". ";
                if (possibleLetters.length > 0) {
                    outPrompt=outPrompt+'Lets try another one. ';
                }
                handleNextLetter(session,response);
            });
        });
    },

    "EndGameIntent": function (intent, session, response) {
        handleEndGameRequest(session,response);
    },

    "SaveAndQuitIntent": function (intent, session, response) {
        handleSaveAndQuitRequest(session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        spokenLetterInput = session.attributes.currentLetter;
        var helpOutput="You can name the word that matches the letter "+spokenLetterInput+", or you can skip this letter and try another by saying next, or you can end the game by saying stop.";
        response.ask(helpOutput, helpOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        handleEndGameRequest(session,response);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        handleEndGameRequest(session,response);
    }
};


function handleNewGameRequest(session, response) {
    myStorage.loadFromDB(session,newGameState, function(gS) {
        gameState=gS;           
        if (session.restoreFromDB !== undefined) {
            outPrompt="Welcome back to Alpha Bravo Charlie, the game that tests your knowledge of the phonetic alphabet used by NATO and aviation professionals around the world. We're starting from a previously saved game, please let me know if you want to start over instead. ";
            if (gameState.currentLetter !="") {
                gameState.possibleLetters=gameState.currentLetter+gameState.possibleLetters;
                //outPrompt=outPrompt+"Found possible letter "+gameState.currentLetter+". ";
            }
        } else {
            outPrompt='Welcome to Alpha Bravo Charlie, the word game that tests your knowledge of the phonetic alphabet used by NATO and aviation professionals around the world. Lets begin! ';
        }
        myStorage.writeGameStateToSession(session,gameState);
        possibleLetters=gameState.possibleLetters;
        handleNextLetter(session,response);
    });
}


function handleEndGameRequest(session,response) {
    var speechOutput = outPrompt+"Thank you for playing Alpha Bravo Charlie! Goodbye";
    session.attributes.possibleLetters=possibleLetters;
    session.attributes.successfulGuesses="";
    session.attributes.failedGuesses="";
    session.attributes.score=0;
    session.attributes.tries=0;
    myStorage.saveToDB(session, newGameState, function() {
        response.tell(speechOutput);
    });   
}

function handleSaveAndQuitRequest(session,response) {
    var speechOutput = outPrompt+"Your game has been saved! You can resume the next time you play the game. Thank you for playing Alpha Bravo Charlie! ";
    response.tell(speechOutput); 
}

function handleNextLetter(session, response) {
    score=session.attributes.score;
    if (session.attributes.possibleLetters != null) {
        possibleLetters = session.attributes.possibleLetters;
    }
    // check to see if there are any letters left
    if (possibleLetters.length < 1) {
        outPrompt=outPrompt+" That's all twenty six letters! Congptratulations! Your final score is "+score.toString()+". ";
        handleEndGameRequest(session,response);
    } else {
        // Find the next letter
        var nextLetterPos = Math.floor(Math.random()*possibleLetters.length);
        var nextLetter = possibleLetters.charAt(nextLetterPos);
        //remove it from future play
        var remainingLetters=(possibleLetters.split(nextLetter)).join("");
        session.attributes.possibleLetters = remainingLetters;
        session.attributes.currentLetter = nextLetter;
        var scoredValue=scorePoints[nextLetter]*scoreModifiers[0];
        myStorage.extractGameStateFromSession(session, function(gameState) {
            myStorage.saveToDB(session, gameState, function() {
                var speechOutput = "<speak>"+outPrompt+"For "+scoredValue.toString()+" points, tell me the phonetic alphabet word for the letter "+nextLetter+"</speak>";
                var outputSpeechJSON = { 
                   "speech": speechOutput,
                   "type": "SSML"
                };

                response.askWithCard( outputSpeechJSON, "Alpha Bravo Charlie",speechOutput);
            });
        });
    }
}

function handleGuessedWord(session,response) {
    var correctAnswer = phoneticAlphabet[spokenLetterInput];
    if (correctAnswer == guessedWord) {
        score=session.attributes.score;
        var scoredValue=scorePoints[spokenLetterInput]*scoreModifiers[session.attributes.tries];
        score=score+scoredValue;
        session.attributes.score=score;
        session.attributes.tries=0;
        //handleNextLetter(session,response);
        outPrompt = outPrompt+"Thats correct! Well done! You earned "+scoredValue.toString()+" points! Your score is now "+score.toString()+". ";
        successfulGuesses=session.attributes.successfulGuesses;
        successfulGuesses=successfulGuesses+spokenLetterInput;
        session.attributes.successfulGuesses=successfulGuesses;
        handleNextLetter(session,response);
    } else {
        tries = session.attributes.tries;
        tries=tries+1;
        if (tries < 3) {
            session.attributes.tries=tries;
            var scoredValue=scorePoints[spokenLetterInput]*scoreModifiers[session.attributes.tries];
            myStorage.extractGameStateFromSession(session, function(gameState) {
                myStorage.saveToDB(session, gameState, function() {
                    outPrompt = outPrompt+"I'm sorry, but "+guessedWord+" is not the correct answer. You can try again for "+scoredValue.toString()+" points, or say skip if you want to try a new letter. ";
                    var speechOutput = "<speak>"+outPrompt+"Tell me the phonetic alphabet word for the letter "+spokenLetterInput+"</speak>";
                    var outputSpeechJSON = { 
                        "speech": speechOutput,
                        "type": "SSML"
                    };

                    response.askWithCard( outputSpeechJSON, "Alpha Bravo Charlie",speechOutput);
                });
            });
        } else {
            session.attributes.tries=0;
            outPrompt = outPrompt+"I'm sorry, but "+guessedWord+" is not the correct answer. The correct answer for the letter "+session.attributes.currentLetter+" is "+phoneticAlphabet[session.attributes.currentLetter]+". ";
            if (session.attributes.possibleLetters.length > 0) {
                outPrompt = outPrompt+"Lets move on to a new letter. ";
            }
            failedGuesses=session.attributes.failedGuesses;
            failedGuesses=failedGuesses+spokenLetterInput;
            session.attributes.failedGuesses=failedGuesses;
            handleNextLetter(session,response);
        }
    }
}


// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the AlphaBravoCharlie skill.
    outPrompt='';
    successfulGuesses='';
    failedGuesses='';
    score=0;
    tries=0;
    var alphaBravoCharlie = new AlphaBravoCharlie();
    alphaBravoCharlie.execute(event, context);
};

