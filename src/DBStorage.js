
'use strict';

//if (process.env.NODE_ENV == "TEST") {
	// Use a local DynamoDB instance rather than AWS
//	var AWS = require("aws-sdk");
//
//	AWS.config.update({
//	  region: "us-east-1",
//	  endpoint: "http://localhost:8000"
//	});
//}

var doc = require('dynamodb-doc');
var docClient = new doc.DynamoDB();

var table = "AlfaBravoCharlieUsers";
var defaultGameState = {
        sessionId: "",
                currentLetter: "",
                possibleLetters: "",
                failedGuesses: "",
                successfulGuesses: "",
                tries: 0,
                score: 0
    };

function DBStorage() {
    var docClient = new doc.DynamoDB();
    //var docClient = new AWS.DynamoDB.DocumentClient();
    //var table = "AlfaBravoCharlieUsers";
    var defaultGameState = {
        sessionId: "",
                currentLetter: "",
                possibleLetters: "",
                failedGuesses: "",
                successfulGuesses: "",
                tries: 0,
                score: 0
    };
};

DBStorage.prototype = {
    constructor: DBStorage,

    setDefaultGameState(inGameState) {
        defaultGameState=inGameState;
        console.log('defaultGameState called');
    },

    extractGameStateFromSession(session,callback) {
        var gS=JSON.parse(JSON.stringify(defaultGameState));
        //var gS={};
        gS.sessionId=session.sessionId;
        if (session.attributes === undefined) {
            // the session just does not have any game state info, return the default
            callback(gS);
        }
        if (session.attributes.currentLetter !== undefined) { gS.currentLetter = session.attributes.currentLetter;}
        if (session.attributes.possibleLetters !== undefined) { gS.possibleLetters = session.attributes.possibleLetters;}
        if (session.attributes.failedGuesses !== undefined) { gS.failedGuesses = session.attributes.failedGuesses;}
        if (session.attributes.successfulGuesses !== undefined) { gS.successfulGuesses = session.attributes.successfulGuesses;}
        if (session.attributes.tries !== undefined) { gS.tries = session.attributes.tries;}
        if (session.attributes.score !== undefined) { gS.score = session.attributes.score;}
        callback(gS);
    },

    writeGameStateToSession(session,gameState) {
        if (session.attributes === undefined) {
            session.attributes = {};
        }
        session.attributes.currentLetter=gameState.currentLetter;
        session.attributes.possibleLetters=gameState.possibleLetters;
        session.attributes.failedGuesses=gameState.failedGuesses;
        session.attributes.successfulGuesses=gameState.successfulGuesses;
        session.attributes.tries=gameState.tries;
        session.attributes.score=gameState.score;
    },

    loadFromDB: function(session,gameState,callback) {
        var customerId = session.user.userId;
        var params = {
            TableName: table,
            Key: {
                "CustomerId":  customerId
            }
        };
        if (gameState === null) {
            console.log("gameState is null, providing empty structure.");
            gameState=defaultGameState;
        }
        docClient.getItem(params, function(err, data) {
            if (err) {
                // either there is no entry for that customer ID, or some other problem. Assume
                // this is a fresh session and get on with it.
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                gameState=defaultGameState;
                gameState.sessionId = session.sessionId;
                callback(gameState);
            } else {
                if ((data == {}) || (data.Item === undefined) || (data.Item == {})) {
                    // No records found. Time to return the default game state
                    console.log("No records found, returning default game state");
                    gameState = defaultGameState;
                    gameState.sessionId = session.sessionId;
                    callback(gameState);
                } else {
                    console.log("data.Item: "+JSON.stringify(data.Item));
                
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                    console.log("sessionID from storage:", data.Item.sessionId);
                    console.log("sessionID from session:", session.sessionId);
                    var storedGameState = {
                        sessionId: data.Item.sessionId,
                        currentLetter: data.Item.currentLetter,
                        possibleLetters: data.Item.possibleLetters,
                        failedGuesses: data.Item.failedGuesses,
                        successfulGuesses: data.Item.successfulGuesses,
                        tries: data.Item.tries,
                        score: data.Item.score
                    };
                    if (storedGameState.currentLetter == "()") { storedGameState.currentLetter="";}
                    if (storedGameState.possibleLetters == "()") { storedGameState.possibleLetters="";}
                    if (storedGameState.failedGuesses == "()") { storedGameState.failedGuesses="";}
                    if (storedGameState.successfulGuesses == "()") { storedGameState.successfulGuesses="";}
                    console.log("storedGameState: ", JSON.stringify(storedGameState));
                    if (session.sessionId !== data.Item.sessionId) {
                        // Ok, we have a difference between the stored session and the current session!
                        // So if the stored session is non-zero, and the current session is zero, then
                        // we're resuming play.
                        console.log("Session mismatch.");
                        if (storedGameState.score == 0) {
                            gameState=defaultGameState;
                            gameState.sessionId = session.sessionId;
                        } else {
                            if (session.attributes === undefined) {
                                gameState=storedGameState;
                                session.restoreFromDB=1;
                            } else {
                                if (session.attributes.score=== undefined) {
                                    // new session has a null or zero score, go with the stored version
                                    gameState = storedGameState;
                                    console.log("Restored from DB.");
                                    session.restoreFromDB=1;
                                } else {
                                    if (session.attributes.currentLetter == "") {
                                        gameState = storedGameState;
                                        session.restoreFromDB=1;
                                    }
                                }
                            }
                            // we have an active game that is different from the stored one... weird, this
                            // should not happen. But, if it does, here is how we fix it -- do nothing.
                        }
                    }
                }
                
            }
            callback(gameState);
        });
    },

    saveToDB: function(session, gameState,callback) {
        var customerId = session.user.userId;
        var cLetter = gameState.currentLetter;
        var pLetters = gameState.possibleLetters;
        var fGuesses = gameState.failedGuesses;
        var sGuesses = gameState.successfulGuesses;
        if (cLetter=="") { cLetter = "()"; }
        if (pLetters=="") { pLetters = "()"; }
        if (fGuesses=="") { fGuesses = "()"; }
        if (sGuesses=="") { sGuesses = "()"; }
        var params = {
            TableName: table,
            Item: {
                "CustomerId": customerId,
                "sessionId": session.sessionId,
                "currentLetter": cLetter,
                "possibleLetters": pLetters,
                "failedGuesses": fGuesses,
                "successfulGuesses": sGuesses,
                "tries": gameState.tries,
                "score": gameState.score
            }        
        }
        console.log("params: " + JSON.stringify(params));
        docClient.putItem(params, function(err, data) {
            if (err) {
                console.error("Unable to save customer record ", customerId, ". Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("PutItem succeeded: ", customerId);
            }
            callback();
        });

    },

    deleteUserFromDB: function(session, callback) {
        var customerId = session.user.userId;
        var params = {
            TableName: table,
            Key: {
                "CustomerId": customerId
            }
        };
        console.log("Attempting to delete user from DB ("+customerId+")..");
        docClient.delete(params, function(err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            }
            callback();
        });
    }



};


module.exports = DBStorage;
