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
			var html = "<ul>";
			for (var i = 0; i < shows.length; i++) {
				html += "<li><a href='http://www.hulu.com/watch/" + shows[i].id + "' target='_BLANK'><img class='thumbnail' src='" + shows[i]["thumbnail_url"] + "'/><img class='play' src='images/play.png'/><span>" + shows[i]["title"] + "</a></li>";
			}
			html += "</ul>";
			queue.innerHTML = html;
			console.log(shows);
		} else {
			container.className = "empty_queue";
		}
	}
};
