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

			var previous_shows = (localStorage["Qulu:shows"] ? JSON.parse(localStorage["Qulu:shows"]) : []);
			var show_ids = [];
			for (var i = 0; i < previous_shows.length; i++) {
				if (previous_shows[i].seen == "yes") {
					show_ids.push(previous_shows[i].id);
				}
			}

			// parsing the shows and saving in localStorage
			var shows = queue.getElementsByClassName('r');
			var show, id, thumbnail_url, show_title, episode_title;
			var stored_shows = [];
			var new_shows_number = 0;

			for (var i = 0; i < shows.length; i++) {
				var new_show = {};
				show = shows[i];
				new_show.id = show.id.substring(7);
				if (show_ids.indexOf(new_show.id) == -1) {
					new_shows_number++;
					new_show.seen = "no";
				} else {
					new_show.seen = "yes";
				}
				new_show.thumbnail_url = show.getElementsByClassName('thumbnail')[0].src.replace("145x80", "290x160");
				var title_divs = show.getElementsByClassName('c2')[0].getElementsByTagName('div')[1].children;
				new_show.title = (title_divs[0].href == "http://www.hulu.com/plus?src=sticker" ? title_divs[0].innerHTML + " " + title_divs[1].innerHTML : title_divs[0].innerHTML);
				stored_shows.push(new_show);
			}
			localStorage["Qulu:shows"] = JSON.stringify(stored_shows);

			var number = (shows.length >= 25 ? "25+" : shows.length.toString());
			if (new_shows_number) {
				chrome.browserAction.setBadgeBackgroundColor({color: [125, 185, 65, 255]}); // green
				chrome.browserAction.setBadgeText({text: "+" + new_shows_number});
			} else {
				chrome.browserAction.setBadgeBackgroundColor({color: "#888"}); // gray
				chrome.browserAction.setBadgeText({text: number});
			}

			chrome.browserAction.setTitle({title: number + " video" + (number != 1 ? "s" : "") + " in your queue"});
			localStorage["Qulu:queueLength"] = number;
		} else {
			chrome.browserAction.setBadgeBackgroundColor({color: "#888"}); // gray
			chrome.browserAction.setBadgeText({text: ""});
			chrome.browserAction.setTitle({title: "Empty queue"});
			localStorage["Qulu:queueLength"] = 0;
		}
	}
}

chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log('received message');
		if (request.mixpanel) {
			request.event_properties = request.event_properties || {};
			console.log('sending event to Mixpanel:' + request.mixpanel + request.event_properties);
			mixpanel.track(request.mixpanel, request.event_properties);
		}
});
checkQueue();
