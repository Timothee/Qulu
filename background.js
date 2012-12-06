// start interval of 5 minutes or so to check hulu.com/profile/queue
// and scrape it to know what is in the queue
// if something
// 		change badge with correct number
// 		save list in localStorage or something
// if nothing
// 		change badge
// if not logged in
// 		change badge to "?"
// 		change popup to error message

var QUEUE_URL = "http://www.hulu.com/profile/queue";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var click_destination_url = QUEUE_URL;

setInterval(checkQueue, 30000);

function checkQueue() {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", QUEUE_URL);
	xhr.responseType = "document";
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			scrapePage(this);
		}
	};
	xhr.send();
}

function scrapePage(xhr) {
	var doc = xhr.response, queue;
	// The XHR was redirected to the login page, thus we're logged out
	if (doc.title == "Hulu - Account") {
		click_destination_url = LOGIN_URL;
		localStorage["Qulu:loggedIn"] = false;
		chrome.browserAction.setBadgeBackgroundColor({color: "#888"});
		chrome.browserAction.setBadgeText({text: "?"});
		chrome.browserAction.setTitle({title: "You are not logged in."});
	} else {
		click_destination_url = QUEUE_URL;
		localStorage["Qulu:loggedIn"] = true;
		if (queue = doc.getElementById('queue')) {
			console.log(queue);
			var shows = queue.getElementsByClassName('r');
			var number = shows.length;
			chrome.browserAction.setBadgeBackgroundColor({color: [125, 185, 65, 255]});
			chrome.browserAction.setBadgeText({text: number.toString()});
			chrome.browserAction.setTitle({title: number + " video" + (number != 1 ? "s" : "") + " in your queue"});
			localStorage["Qulu:queueLength"] = number;

		} else {
			chrome.browserAction.setBadgeBackgroundColor({color: "#888"});
			chrome.browserAction.setBadgeText({text: ""});
			chrome.browserAction.setTitle({title: "Empty queue"});
			localStorage["Qulu:queueLength"] = 0;
		}
	}
}

chrome.browserAction.onClicked.addListener( function(tab) {
	if (tab.url != click_destination_url) {
		chrome.tabs.create({url: click_destination_url});
	}
});

checkQueue()
