// This is in minutes
var POLL_DELAY_MINUTES = 15;

var QUEUE_URL = "http://www.hulu.com/profile/queue?kind=thumbs&view=list&order=desc&sort=position";
var LOGIN_URL = "https://secure.hulu.com/account/signin";
var DELETE_URL = "http://www.hulu.com/users/remove_from_playlist/";
var WATCH_URL = 'http://www.hulu.com/watch/';

chrome.runtime.onInstalled.addListener(function() {
    chrome.alarms.create('checkQueue', {periodInMinutes: POLL_DELAY_MINUTES});
    existingQueue.fetch();
    checkQueue();
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'checkQueue') {
        existingQueue.fetch();
        checkQueue();
    }
});

chrome.notifications.onClosed.addListener(function(id) {
    if (id !== 'notificationsQuestion') {
        trackEvent('close notification', {show_id: id});

        existingQueue.fetch();
        var show = existingQueue.get(id);
        if (show) {
            show.save({fresh: false});
        }
        updateBadge();
    } else {
        chrome.notifications.clear(id, function() {});
    }
});

chrome.notifications.onClicked.addListener(function(id) {
    if (id !== 'notificationsQuestion') {
        trackEvent('click notification', {show_id: id});

        chrome.windows.create({
            url: WATCH_URL + id,
            type: 'normal'
        });
        var show = existingQueue.get(id);
        if (show) {
            show.save({fresh: false});
        }
        updateBadge();
    } else {
        chrome.notifications.clear(id, function() {});
    }
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId === 'notificationsQuestion') {
        if (buttonIndex === 0) {
            trackEvent('notificationsQuestion', {choice: true});
            localStorage['Qulu:options:notifications'] = true;
            chrome.notifications.clear(notificationId, function() {});
            createNotifications(existingQueue.where({fresh: true}));
        } else {
            trackEvent('notificationsQuestion', {choice: false});
            localStorage['Qulu:options:notifications'] = false;
            chrome.notifications.getAll(function(notifications) {
                _.each(notifications, function(value, notification) {
                    chrome.notifications.clear(notification, function() {});
                });
            });
        }
    }
});

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.trackEvent) {
            request.eventProperties = request.eventProperties || {};
            trackEvent(request.trackEvent, request.eventProperties);
        } else if (request.deleteShow) {
            trackEvent("delete show");
            deleteShow(request.deleteShow);
            updateBadge();
        } else if (request.resetSeenState) {
            resetSeenState();
            updateBadge();
        } else if (request.updateBadge) {
            updateBadge();
        }
    }
);

// resetting "seen" state on all the shows
function resetSeenState() {
    existingQueue.fetch();
    existingQueue.each(function(episode) {
        episode.save({fresh: false});
    });
}

var existingQueue = new Queue();
existingQueue.fetch();

// Order of operations:
// - poll to get queue page
// - populate collection in localstorage
// - update badge according to new state

// Colors
var colors = {
    green: [125, 185, 65, 255],
    gray: '#888',
    red: '#f00'
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
    var expiringShows = existingQueue.filter(function(show) {
        return show.isExpiringSoon();
    });
    var queueLength = existingQueue.length >= 25 ? "25+" : String(existingQueue.length);

    if (newShows.length) {
        chrome.browserAction.setBadgeBackgroundColor({color: colors.green});
        chrome.browserAction.setBadgeText({text: "+" + newShows.length});
    } else if (expiringShows.length) {
        chrome.browserAction.setBadgeBackgroundColor({color: colors.red});
        chrome.browserAction.setBadgeText({text: String(expiringShows.length)});
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

                data.airdate = (new Date($(show).find('.c5')[0].innerText)).getTime();
                if (isNaN(data.airdate)) {
                    data.airdate = (new Date(2010, 0)).getTime();
                }

                data.expirationDate = (new Date($(show).find('.c6')[0].innerText)).getTime();
                if (isNaN(data.expirationDate)) {
                    data.expirationDate = (new Date(2050, 0)).getTime();
                }

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
                if (!incomingQueue.get(episode)) {
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

function createNotifications(shows) {
    if (localStorage['Qulu:options:notifications'] === undefined) {
        chrome.notifications.clear('notificationsQuestion', function() {
            chrome.notifications.create('notificationsQuestion', {
                type: 'basic',
                title: 'Qulu, your Hulu Queue',
                iconUrl: 'images/logo_128x128.png',
                message: 'Do you want to get desktop notifications for new show arrivals?\n(you can change this on the Options page later)\n',
                buttons: [
                    { title: 'Yes'},
                    { title: 'No' }
                ]
            }, function() {});
        });


    } else if (localStorage['Qulu:options:notifications'] === 'true') {
        chrome.notifications.getAll(function(existingNotifications) {
            // Desktop notifications
            _.each(shows, function(show) {
                // Only create a notification if we haven't already
                // (even if the show is still seen as 'fresh')
                if ((show.id in existingNotifications) === false) {
                    getDataURL(show).then(function(show, dataURL) {
                        var strippedTitle = stripHTML(show.get('title'));
                        chrome.notifications.create(show.id, {
                            type: 'image',
                            iconUrl: 'images/logo_128x128.png',
                            title: strippedTitle,
                            message: 'Click to watch now!',
                            imageUrl: dataURL
                        }, function(id) {});
                    });
                }
            });
        });
    }
}

function trackEvent(eventName, eventProperties) {
    mixpanel.track(eventName, eventProperties);

    if (localStorage['Qulu:event:' + eventName]) {
        localStorage['Qulu:event:' + eventName]++;
    } else {
        localStorage['Qulu:event:' + eventName] = 1;
    }
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

    img.src = show.get('thumbnailUrl');

    return deferred.promise();
}

function stripHTML(input) {
    var div = document.createElement('div');
    div.innerHTML = input;
    return (div.textContent || div.innerText || input).trim();
}
