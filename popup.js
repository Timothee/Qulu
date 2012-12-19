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
			container.className = "queue";
			var shows = JSON.parse(localStorage["Qulu:shows"]);
			var list = document.createElement('ul');
			for (var i = 0; i < shows.length; i++) {
				var new_item = document.createElement('li');
				new_item.innerHTML = "<a href='http://www.hulu.com/watch/" + shows[i].id + "' target='_BLANK'>" +
					"<img class='thumbnail' src='" + shows[i]["thumbnail_url"] + "'/>" +
					"<img class='play' src='images/play.png'/>" +
					"<span>" + shows[i]["title"] +
					"</a>";
				(function(show) {
					new_item.addEventListener('click', function(e) {
						console.log(show);
						chrome.extension.sendMessage({mixpanel: "click video", event_properties: {
							queue_length: shows.length,
							show_id: show.id
						}});
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
mixpanel.track('open popup');
