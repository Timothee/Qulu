// resetting "seen" state on all the shows
function resetSeenState(shows) {
	var shows = JSON.parse(localStorage["Qulu:shows"]);
	chrome.browserAction.setBadgeBackgroundColor({color: "#888"}); // gray
	for (var i = 0; i < shows.length; i++) {
		console.log('changing seen');
		shows[i].seen = "yes";
	}
	console.log(shows);
	localStorage["Qulu:shows"] = JSON.stringify(shows);
}

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
			var shows = JSON.parse(localStorage["Qulu:shows"]);
			var number = (shows.length >= 25 ? "25+" : shows.length.toString());
			chrome.browserAction.setBadgeText({text: number});

			container.className = "queue";
			var list = document.createElement('ul');

			for (var i = 0; i < shows.length; i++) {
				var new_item = document.createElement('li');
				new_item.className = "show" + (shows[i]["seen"] == "yes" ? "" : " new");
				new_item.innerHTML = "<a href='http://www.hulu.com/watch/" + shows[i].id + "' target='_BLANK'>" +
					"<img class='thumbnail' src='" + shows[i]["thumbnail_url"] + "'/>" +
					"<img class='play' src='images/play.png'/>" +
					"<span>" + shows[i]["title"] + "</span>" +
					"</a>" +
					"<img class='delete' alt='Remove from queue' title='Remove from queue' src='images/delete.png'/>" +
					"<img class='new' alt='New video' title='New video' src='images/pale_blue_dot.png'/>";
				(function(show, position_in_queue) {
					(new_item.getElementsByTagName('a')[0]).addEventListener('click', function(e) {
						console.log(show);
						chrome.extension.sendMessage({mixpanel: "click video", event_properties: {
							queue_length: shows.length,
							show_id: show.id,
							position: position_in_queue,
							new: (show["seen"] != "yes")
						}});
					});
					(new_item.getElementsByClassName('delete')[0]).addEventListener('click', function(e) {
						console.log("deleting show");
						chrome.extension.sendMessage({deleteShow: show.id});
						var show_li = this.parentElement;
						show_li.className = "show deleted";
						setTimeout(function() {
							show_li.parentElement.removeChild(show_li);
							if (queue.getElementsByClassName('show').length == 0) {
								container.className = "empty_queue";
							}
						}, 500);
					});
				})(shows[i], i);
				list.appendChild(new_item);
			}
			queue.innerHTML = "";
			queue.appendChild(list);
			console.log(shows);
			resetSeenState();
		} else {
			container.className = "empty_queue";
		}
	}
};
chrome.extension.sendMessage({mixpanel: "open popup"});
