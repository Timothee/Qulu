
var QUEUE_URL = "http://www.hulu.com/profile/queue?kind=thumbs&view=list&order=desc&sort=position";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var DELETE_URL = "http://www.hulu.com/users/remove_from_playlist/";

setInterval(checkQueue, 10000);

function checkQueue() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", QUEUE_URL);
    xhr.responseType = "document";
    xhr.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            scrapePage(this);
        }
    };
    xhr.send();
}

function deleteShow(showId) {
    chrome.browserAction.getBadgeText({}, function(string) {
        var count = parseInt(string) - 1;
        chrome.browserAction.setBadgeText({text: (count ? count.toString() : "")});
    });
    var xhr = new XMLHttpRequest();
    xhr.open("POST", DELETE_URL + showId);
    xhr.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            console.log("show " + showId + " deleted");
        }
    };
    xhr.send();
}

function scrapePage(xhr) {
    var doc = xhr.response;
    var queue;
    // The XHR was redirected to the login page, thus we're logged out
    if (doc.title === "Hulu - Account") {
        displayLogin();
    } else {
        localStorage["Qulu:loggedIn"] = true;
        if (queue = doc.getElementById('queue')) {
            var previous_shows = (localStorage["Qulu:shows"] ? JSON.parse(localStorage["Qulu:shows"]) : []);
            var show_ids = [];
            for (var i = 0; i < previous_shows.length; i++) {
                if (previous_shows[i].seen === "yes") {
                    show_ids.push(previous_shows[i].id);
                }
            }

            // parsing the shows and saving in localStorage
            var shows = queue.getElementsByClassName('r');
            var show, id, thumbnail_url, show_title, episode_title;
            var stored_shows = [];
            var new_shows = [];
            var new_shows_number = 0;

            for (var i = 0; i < shows.length; i++) {
                var new_show = {};
                show = shows[i];
                new_show.id = show.id.substring(7);
                if (show_ids.indexOf(new_show.id) === -1) {
                    new_shows_number++;
                    new_show.seen = "no";
                } else {
                    new_show.seen = "yes";
                }
                new_show.thumbnail_url = show.getElementsByClassName('thumbnail')[0].src.replace("145x80", "580x320");
                var title_divs = show.getElementsByClassName('c2')[0].getElementsByTagName('div')[1].children;
                new_show.title = (title_divs[0].href === "http://www.hulu.com/plus?src=sticker" ? title_divs[0].innerHTML + " " + title_divs[1].innerHTML : title_divs[0].innerHTML);
                stored_shows.push(new_show);

                if (new_show.seen === 'no') {
                    new_shows.push(new_show);
                }
            }
            localStorage["Qulu:shows"] = JSON.stringify(stored_shows);

            // Display badge
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

            createNotifications(new_shows);
        } else {
            displayEmptyQueue();
        }
    }
}

function displayLogin() {
    localStorage["Qulu:loggedIn"] = false;
    chrome.browserAction.setBadgeBackgroundColor({color: "#888"});
    chrome.browserAction.setBadgeText({text: "?"});
    chrome.browserAction.setTitle({title: "You are not logged in."});
}

function displayEmptyQueue() {
    chrome.browserAction.setBadgeBackgroundColor({color: "#888"}); // gray
    chrome.browserAction.setBadgeText({text: ""});
    chrome.browserAction.setTitle({title: "Empty queue"});
    localStorage["Qulu:queueLength"] = 0;
}

function createNotifications(new_shows) {
    chrome.notifications.getAll(function(existingNotifications) {
        // Desktop notifications
        for (var i = 0; i < new_shows.length; i++) {
            var show = new_shows[i];

            // Only create a notification if we haven't already
            // (even if the show is still seen as 'new')
            if ((show.id in existingNotifications) === false) {
                var strippedTitle = stripHTML(show.title);

                chrome.notifications.create(show.id, {
                    type: 'image',
                    iconUrl: 'images/logo_128x128.png',
                    title: strippedTitle,
                    message: 'New episode available',
                    imageUrl: show.thumbnail_url
                }, function(id) {});
            }
        }
    });
}

function stripHTML(input) {
    var div = document.createElement('div');
    div.innerHTML = input;
    return (div.textContent || div.innerText || input).trim();
}

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log('received message');
        if (request.mixpanel) {
            request.event_properties = request.event_properties || {};
            console.log('sending event to Mixpanel:' + request.mixpanel, request.event_properties);
            mixpanel.track(request.mixpanel, request.event_properties);
        } else if (request.deleteShow) {
            console.log("delete show " + request.deleteShow);
            mixpanel.track("delete show");
            deleteShow(request.deleteShow);

        }
    }
);

checkQueue();
