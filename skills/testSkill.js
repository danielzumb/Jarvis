// custom modules with some hardcoded values/references
var rallyLib = require('../submodules/rallyLib.js');
var extResources = require('../submodules/extResources.js');
var scraper = require('../submodules/scraper.js');
var extDB = require('../submodules/extDB.js');

//var Promise = require("bluebird");
var flow = require('flow');


// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message,direct_mention,mention',
	"mentions": 'direct_mention,mention',
}

var generateLinkAttachment = function(link, title){
	var results = {
		"attachments": [{
			"fallback": title,
			"color": "#36a64f",
			"title": title,
			"title_link": link,
		}]
	}
	return results;
}
var generatePlainAttachmentStr = function(title, str){
	var retAttachment = {
		"attachments": [{
			"fallback": title,
			"title": title,
			"text": str,
		}]
	};
	return retAttachment;
}

var regexList = {
	"case": /^.*ts([0-9]+).*$/i,
	"KB": /^.*kb([0-9]+).*$/i,
	"TN": /^.*TN([0-9]+).*$/i,
	"DE": /^.*DE([0-9]+).*$/i,
	"US": /^.*US([0-9]+).*$/i,
	"websdk": /websdk/i,
	"mobilesdk1": /mob(.*)sdk/i,
	"mobilesdk2": /iossdk/i,
	"mobilesdk3": /andr(.*)sdk/i,
	"vissdk": /vis(.*)sdk/i,
	"restapi1": /rest(.*)sdk/i,
	"restapi2": /rest(.*)api/i,
	"restapi3": /json(.*)api/i,
	"restapi4": /json(.*)sdk/i,
	"datasdk1": /data(.*)sdk/i,
	"datasdk2": /data(.*)api/i,
	"datasdk3": /connector(.*)sdk/i,
	"kbase1": /kbase(.*)/i,
	"kbase2": /technote(.*)/i,
	"kbase3": /tn(.*)/i,
	"kbase4": /community(.*)/i,
	"sdk": /(.*)sdk(.*)/i,
}

var triggerQuickLink = function(bot, message, response){
	//bot.reply(message, response);
	bot.startConversationInThread(message, function(err, convo) {
		if (!err) {
			convo.say(response);
			convo.activate();
		}
	});
}

// listeners
module.exports = function(controller) {
	
	controller.hears(["test"], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
		var params = message.text.split(" ");
		
		console.log("######### thread test tag: ",message.text);
		return true;
		
		triggerQuickLink(bot, message, "tagged in thread");
		extDB.insertPostStat(controller, bot, message, function(cbval){
			debugger;
		})
		debugger;
		/*
		flow.exec(
			function(){
				bot.api.channels.info({channel:message.channel}, this.MULTI('channelInfo'));
				
			},function(callback){
				if(callback[0][0] != null) throw callback[0][0];
				
				bot.api.groups.replies({
		    		channel: message.channel,
					thread_ts: message.thread_ts,
					token: bot.config.bot.app_token,
				}, this.MULTI('groupReplies'));
				
			    bot.api.channels.replies({
			    	channel: message.channel,
					thread_ts: message.thread_ts,
					token: bot.config.bot.app_token,
			
			    }, this.MULTI('channelReplies'));
		
				//- store the channel name once it's known, rather than API calling every time just to get the name.
				//- same for user. Keep it in storage, probably online mongodb.
		
		        controller.storage.users.get(message.user, this.MULTI('userStorage'));
			    bot.api.users.info({user: message.user}, this.MULTI('userInfo'));

				// need it later
				this.message = message;				
			},function(callback){
				// do stuff here
				
				debugger;
				console.log("groupReplies: ",callback["groupReplies"][1].messages);// 1 = second array element = 2nd parameter in callback
				console.log("channelReplies: ",callback["channelReplies"][1].messages);// 1 = second array element = 2nd parameter in callback
				console.log("userStorage: ",callback["userStorage"][1]);// 1 = second array element = 2nd parameter in callback
				console.log("userInfo: ",callback["userInfo"][1]);// 1 = second array element = 2nd parameter in callback
				console.log("channelInfo: ",callback["channelInfo"][1]);// 1 = second array element = 2nd parameter in callback
				
				debugger;
			}
		);*/
		
		return true;
	});
	
	controller.hears(["testold"], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
		var params = message.text.split(" ");
		console.log("######### thread tag: ",message.text);
		
		triggerQuickLink(bot, message, "tagged in thread");
		
		bot.api.groups.replies({
	    	channel: message.channel,
			thread_ts: message.thread_ts,
			token: bot.config.bot.app_token,
		}, (err, response) => {
			console.log("botapigroups: ", err, response);
			
		})
		
	    bot.api.channels.replies({
	    	channel: message.channel,
			thread_ts: message.thread_ts,
			token: bot.config.bot.app_token,
			
	    }, (err, response) => {
			console.log("botapichannels: ", err, response);
	    });
		
        controller.storage.users.get(message.user, (err, user) => {
			console.log("error, user: ",err, user);
		});
		
	    bot.api.users.info({user: message.user}, (error, response) => {
		
		});
		
	});




};
