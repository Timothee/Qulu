window.onload = function () {
	var container = document.getElementById("container");
	var logged_out = document.getElementById("logged_out");
	var empty_queue = document.getElementById("empty_queue");
	var queue = document.getElementById("queue");

	if (localStorage["Qulu:loggedIn"] == "false") {
		container.className = "logged_out";
		queue.innerHTML = "You are not logged in";
		queue.className = "loggedout";
	} else {
		if (parseInt(localStorage["Qulu:queueLength"])) {
			// resetting "seen" state on all the shows
			var shows = JSON.parse(localStorage["Qulu:shows"]);
			chrome.browserAction.setBadgeBackgroundColor({color: "#888"}); // gray
			for (var i = 0; i < shows.length; i++) {
				console.log('changing seen');
				shows[i].seen = "yes";
			}
			console.log(shows);
			localStorage["Qulu:shows"] = JSON.stringify(shows);

			var number = (shows.length >= 25 ? "25+" : shows.length.toString());
			chrome.browserAction.setBadgeText({text: number});

			container.className = "queue";
			var list = document.createElement('ul');

			for (var i = 0; i < shows.length; i++) {
				var new_item = document.createElement('li');
				new_item.innerHTML = "<a href='http://www.hulu.com/watch/" + shows[i].id + "' target='_BLANK'>" +
					"<img class='thumbnail' src='" + shows[i]["thumbnail_url"] + "'/>" +
					"<img class='play' src='images/play.png'/>" +
					"<span>" + shows[i]["title"] + "</span>" +
					"</a>" +
					"<img class='delete' alt='Remove from queue' title='Remove from queue' src='images/delete.png'/>";
				(function(show) {
					(new_item.getElementsByTagName('a')[0]).addEventListener('click', function(e) {
						console.log(show);
						chrome.extension.sendMessage({mixpanel: "click video", event_properties: {
							queue_length: shows.length,
							show_id: show.id
						}});
					});
					(new_item.getElementsByClassName('delete')[0]).addEventListener('click', function(e) {
						console.log("deleting show");
						chrome.extension.sendMessage({deleteShow: show.id});
						this.parentElement.className = "deleted";
					});
				})(shows[i]);
				list.appendChild(new_item);
			}
			queue.innerHTML = "";
			queue.appendChild(list);
			console.log(shows);
		} else {
			container.className = "empty_queue";
		}
	}
};
chrome.extension.sendMessage({mixpanel: "open popup"});
