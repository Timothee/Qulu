window.onload = function () {
	var list = document.getElementById("list");
	if (localStorage["Qulu:loggedIn"] == "false") {
		list.innerHTML = "You are not logged in";
		list.className = "loggedout";
	} else {
		if (parseInt(localStorage["Qulu:queueLength"])) {
			var shows = JSON.parse(localStorage["Qulu:shows"]);
			var html = "<ul>";
			for (var i = 0; i < shows.length; i++) {
				html += "<li><a href='http://www.hulu.com/watch/" + shows[i].id + "' target='_BLANK'><img class='thumbnail' src='" + shows[i]["thumbnail_url"] + "'/><img class='play' src='images/play.png'/><span>" + shows[i]["title"] + "</a></li>";
			}
			html += "</ul>";
			list.innerHTML = html;
			console.log(shows);
		} else {
			list.innerHTML = "Your queue is empty.";
			list.className = "empty";
		}
	}
};
