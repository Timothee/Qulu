var QUEUE_URL = "http://www.hulu.com/profile/queue?kind=thumbs&view=list&order=desc&sort=position";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var DELETE_URL = "http://www.hulu.com/users/remove_from_playlist/";
var WATCH_URL = 'http://www.hulu.com/watch/';

var existingQueue = new Queue();
existingQueue.fetch();

setInterval(checkQueue, 10000);
checkQueue();


// Order of operations:
// - poll to get queue page
// - populate collection in localstorage
// - update badge according to new state

// Colors
var colors = {
    green: [125, 185, 65, 255],
    gray: '#888',
    red: ''
};

/*
 * This function updates the badge based on the current state of the show
 * collection and the login state.
 * States to check:
 * - logged in or not
 * - empty queue?
 * - any new shows?
 * - total number of shows
 */
function updateBadge() {
    existingQueue.fetch({silent: true});

    if (Boolean(localStorage["Qulu:loggedIn"]) === false) {
        displayLogin();
        return;
    }

    if (existingQueue.length === 0) {
        displayEmptyQueue();
        return;
    }

    var newShows = existingQueue.where({fresh: true});
    var queueLength = existingQueue.length >= 25 ? "25+" : String(existingQueue.length);

    if (newShows.length) {
        chrome.browserAction.setBadgeBackgroundColor({color: colors.green});
        chrome.browserAction.setBadgeText({text: "+" + newShows.length});
    } else {
        chrome.browserAction.setBadgeBackgroundColor({color: colors.gray});
        chrome.browserAction.setBadgeText({text: queueLength});
    }
    chrome.browserAction.setTitle({title: queueLength + " video" + (queueLength != 1 ? "s" : "") + " in your queue"});
}

function displayLogin() {
    chrome.browserAction.setBadgeBackgroundColor({color: colors.gray});
    chrome.browserAction.setBadgeText({text: "?"});
    chrome.browserAction.setTitle({title: "You are not logged in."});
}

function displayEmptyQueue() {
    chrome.browserAction.setBadgeBackgroundColor({color: colors.gray});
    chrome.browserAction.setBadgeText({text: ""});
    chrome.browserAction.setTitle({title: "Empty queue"});
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
    existingQueue.fetch({silent: true});
    var show = existingQueue.get(showId);

    if (show) {
        show.destroy();
        var xhr = new XMLHttpRequest();
        xhr.open("POST", DELETE_URL + showId);
        xhr.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                console.log("show " + showId + " deleted");
            }
        };
        xhr.send();
    }
}

function scrapePage(xhr) {
    var doc = xhr.response;
    var queueEl = doc.getElementById('queue');

    // The XHR was redirected to the login page, thus we're logged out
    if (doc.title === "Hulu - Account") {
        localStorage["Qulu:loggedIn"] = false;
    } else {
        localStorage["Qulu:loggedIn"] = true;
        if (queueEl) {
            // parsing the shows and saving in localStorage
            var shows = queueEl.getElementsByClassName('r');
            var incomingQueue = new Queue();

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
                    var data = episode.toJSON();
                    data.fresh = true;
                    existingQueue.create(data);
                }
            });

            // Remove old shows
            existingQueue.each(function(episode) {
                if (!incomingQueue.get(episode.id)) {
                    episode.destroy();
                }
            });

            createNotifications(existingQueue.where({fresh: true}));
        } else {
            existingQueue.reset();
        }
    }
    updateBadge();
}

function createNotifications(newShows) {
    chrome.notifications.getAll(function(existingNotifications) {
        // Desktop notifications
        _.every(newShows, function(show) {
            if ((show.id in existingNotifications) === false) {
                var strippedTitle = stripHTML(show.get('title'));

                if (show.get('thumbnailDataURL')) {
                    chrome.notifications.create(show.id, {
                        type: 'image',
                        iconUrl: chrome.extension.getURL('../images/logo_128x128.png'),
                        title: strippedTitle,
                        message: 'Click to watch now!',
                        imageUrl: show.get('thumbnailDataURL')
                    }, function(id) {});
                    return true;
                } else {
                    getDataURL(show).then(function(show, dataURL) {
                        var strippedTitle = stripHTML(show.get('title'));
                        existingQueue.get(show.id).save({thumbnailDataURL: dataURL});
                        chrome.notifications.create(show.id, {
                            type: 'image',
                            iconUrl: '../images/logo_128x128.png',
                            title: strippedTitle,
                            message: 'Click to watch now!',
                            imageUrl: show.get('thumbnailDataURL')
                        }, function(id) {});
                    });
                    return false;
                }
            } else {
                return true;
            }
        });
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
        if (this.complete === false) {
            console.log('well, here\'s our problem');
        }
        var posX, posY, croppedW, croppedH;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        if (this.width/this.height > 3/2) {
            // It means the image is wider than the result we want
            // Usually the case with Hulu images
            canvas.width = 360;
            canvas.height = 240;

            croppedH = canvas.height;
            croppedW = this.width * canvas.height/this.height;
            posX = Math.floor((canvas.width - this.width * canvas.height / this.height) / 2);
            posY = 0;
        } else {
            // TODO: Should certainly fill that in...
        }

        ctx.drawImage(this, posX, posY, croppedW, croppedH);
        //ctx.fillStyle = "rgb(200,0,0)";
        //ctx.fillRect (10, 10, 55, 50);
        var dataURL = canvas.toDataURL('image/png');

        console.log(dataURL);
        console.log(show.get('thumbnailUrl'));
        deferred.resolveWith(this, [show, dataURL]);
    };

    img.src = show.get('thumbnailUrl').replace('290x160', '435x240');
    console.log(img.src);

    return deferred.promise();
}

function stripHTML(input) {
    var div = document.createElement('div');
    div.innerHTML = input;
    return (div.textContent || div.innerText || input).trim();
}

chrome.extension.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log('received message');
        if (message.mixpanel) {
            message.event_properties = message.event_properties || {};
            console.log('sending event to Mixpanel:' + message.mixpanel, message.event_properties);
            mixpanel.track(message.mixpanel, message.event_properties);
        } else if (message.deleteShow) {
            console.log("delete show " + message.deleteShow);
            mixpanel.track("delete show");
            deleteShow(message.deleteShow);

        } else if (message.updateBadge) {
            updateBadge();
        }
        if (message.createNotifications) {
            var show = message.show;

            getDataURL(show).then(function(show, dataURL) {
                var strippedTitle = stripHTML(show.title);
                chrome.notifications.create(show.showId, {
                    type: 'image',
                    iconUrl: '../images/logo_128x128.png',
                    title: strippedTitle,
                    message: 'Click to watch now!',
                    imageUrl: dataURL
                }, function(id) {});
            });
        }
    }
);

chrome.notifications.onClosed.addListener(function(id) {
    mixpanel.track('close notification', {show_id: id});

    existingQueue.fetch();
    var show = existingQueue.get(id);
    if (show) {
        show.save({fresh: false});
    }
    updateBadge();
});

chrome.notifications.onClicked.addListener(function(id) {
    mixpanel.track('click notification', {show_id: id});

    chrome.windows.create({
        url: WATCH_URL + id,
        type: 'normal'
    });
    var show = existingQueue.get(id);
    if (show) {
        show.save({fresh: false});
    }
    updateBadge();
});

