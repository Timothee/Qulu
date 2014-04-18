var QUEUE_URL = "http://www.hulu.com/profile/queue?kind=thumbs&view=list&order=desc&sort=position";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var DELETE_URL = "http://www.hulu.com/users/remove_from_playlist/";
var WATCH_URL = 'http://www.hulu.com/watch/';

var existingQueue = new Queue();
existingQueue.fetch();
existingQueue.on('reset', updateBadge);

var incomingQueue = new Queue();

//setInterval(checkQueue, 10000);

function updateBadge() {
}

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
    var doc = xhr.response, queueEl;
    // The XHR was redirected to the login page, thus we're logged out
    if (doc.title === "Hulu - Account") {
        displayLogin();
    } else {
        localStorage["Qulu:loggedIn"] = true;
        if (queueEl = doc.getElementById('queue')) {
            var previous_shows = (localStorage["Qulu:shows"] ? JSON.parse(localStorage["Qulu:shows"]) : []);
            var show_ids = [];
            for (var i = 0; i < previous_shows.length; i++) {
                if (previous_shows[i].seen === "yes") {
                    show_ids.push(previous_shows[i].id);
                }
            }

            // parsing the shows and saving in localStorage
            var shows = queueEl.getElementsByClassName('r');
            var show, id, thumbnail_url, show_title, episode_title;
            var stored_shows = [];
            var new_shows = [];
            var new_shows_number = 0;

            _.each(shows, function(show) {
                var data = {};
                data.showId = show.id.substring(7);
                data.thumbnailUrl = show.getElementsByClassName('thumbnail')[0].src.replace("145x80", "290x160");
                var title_divs = show.getElementsByClassName('c2')[0].getElementsByTagName('div')[1].children;
                data.title = (title_divs[0].href === "http://www.hulu.com/plus?src=sticker" ? title_divs[0].innerHTML + " " + title_divs[1].innerHTML : title_divs[0].innerHTML);

                incomingQueue.add(data);
            });

            // Make sure new shows are added and existing ones are updated
            incomingQueue.each(function(episode) {
                var existingEpisode = existingQueue.get(episode);
                if (existingEpisode) {
                    existingEpisode.save(episode.toJSON());
                } else {
                    existingQueue.create(episode.toJSON());
                }
            });

            // Remove old shows
            existingQueue.each(function(episode) {
                if (!incomingQueue.get(episode)) {
                    episode.destroy();
                }
            });

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
                getDataURL(show).then(function(show, dataURL) {
                    var strippedTitle = stripHTML(show.title);
                    chrome.notifications.create(show.id, {
                        type: 'image',
                        iconUrl: 'images/logo_128x128.png',
                        title: strippedTitle,
                        message: 'New episode available. Click to watch now!',
                        imageUrl: dataURL
                    }, function(id) {});
                });
            }
        }
    });
}

/*
 * Method that gets the data URL for an image URL
 *
 * Returns a Promise object that resolves with the passed show and the dataURL
 * as the two arguments.
 * The data URL returned will be 300x200
 */
function getDataURL(show) {
    var deferred = $.Deferred();
    var img = new Image();

    img.onload = function () {
        var posX, posY, croppedW, croppedH;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        if (this.width/this.height > 3/2) {
            // It means the image is wider than the result we want
            // Usually the case with Hulu images
            canvas.height = 200; // 200 and not 240 (actual display size) because
                                 // the image ends up empty if I use the full
                                 // size. Maybe the canvas becomes too big?
                                 // (unlikely, but no idea what's up)
            canvas.width = canvas.height * 3 / 2;

            croppedH = canvas.height;
            croppedW = this.width * canvas.height/this.height;
            posX = (canvas.width - this.width * canvas.height / this.height) / 2;
            posY = 0;
        } else {
            // TODO: Should certainly fill that in...
        }

        ctx.drawImage(this, posX, posY, croppedW, croppedH);
        var dataURL = canvas.toDataURL('image/png');

        deferred.resolveWith(this, [show, dataURL]);
    };

    img.src = show.thumbnail_url;

    return deferred.promise();
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

chrome.notifications.onClosed.addListener(function(id) {
    mixpanel.track('close notification', {show_id: id});

    // Mark show as seen so that the notification is not shown again
    var shows = (localStorage["Qulu:shows"] ? JSON.parse(localStorage["Qulu:shows"]) : []);
    for (var i = 0; i < shows.length; i++) {
        if (shows[i].id === id) {
            shows[i]['seen'] = 'yes';
            continue;
        }
    }
    localStorage["Qulu:shows"] = JSON.stringify(shows);
});

chrome.notifications.onClicked.addListener(function(id) {
    mixpanel.track('click notification', {show_id: id});

    chrome.windows.create({
        url: WATCH_URL + id,
        type: 'normal'
    });
});

checkQueue();
