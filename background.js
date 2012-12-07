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

var QUEUE_URL = "http://www.hulu.com/profile/queue?kind=thumbs&view=list";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var click_destination_url = QUEUE_URL;

setInterval(checkQueue, 10000);

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

			// parsing the shows and saving in localStorage
			var show, id, thumbnail_url, show_title, episode_title;
			var stored_shows = [];
			for (var i = 0; i < shows.length; i++) {
				show = shows[i];
				id = show.id.substring(7);
				thumbnail_url = show.getElementsByClassName('thumbnail')[0].src;
				thumbnail_url = thumbnail_url.replace("145x80", "290x160");
				show_title = show.getElementsByClassName('c2')[0].getElementsByTagName('div')[1].firstChild.innerHTML;
				stored_shows.push({id: id, thumbnail_url: thumbnail_url, title: show_title});
			}
			localStorage["Qulu:shows"] = JSON.stringify(stored_shows);

			console.log(shows);
			console.log(stored_shows);

			var number = (shows.length >= 25 ? "25+" : shows.length.toString());
			chrome.browserAction.setBadgeBackgroundColor({color: [125, 185, 65, 128]});
			chrome.browserAction.setBadgeText({text: number});
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

checkQueue()
