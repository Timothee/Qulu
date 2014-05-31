// resetting "seen" state on all the shows
function resetSeenState(queue) {
    queue.fetch();
    queue.each(function(episode) {
        episode.save({fresh: false});
    });
    chrome.extension.sendMessage({ updateBadge: true });
}

window.onload = function () {
    var container = document.getElementById("container");
    var logged_out = document.getElementById("logged_out");
    var empty_queue = document.getElementById("empty_queue");
    var queueContainer = document.getElementById("queue");
    var queue = new Queue();
    queue.fetch();

    if (localStorage["Qulu:loggedIn"] == "false") {
        container.className = "logged_out";
        queueContainer.innerHTML = "You are not logged in";
        queueContainer.className = "loggedout";
    } else {
        if (queue.length) {
            container.className = "queue";
            var list = document.createElement('ul');

            queue.each(function(episode, index) {
                var listItem = $('<li/>').addClass('show');
                listItem.attr('id', episode.id);

                if (episode.isExpiringSoon()) {
                    listItem.addClass('expiring');
                } else if (episode.isFresh()) {
                    listItem.addClass('new');
                }

                listItem.html("<a href='http://www.hulu.com/watch/" + episode.id + "' target='_BLANK'>" +
                    "<img class='thumbnail' src='" + episode.get("thumbnailUrl") + "'/>" +
                    "<img class='play' src='../images/play.png'/>" +
                    "<span>" + episode.get("title") + "</span>" +
                    "</a>" +
                    "<img class='delete' alt='Remove from queue' title='Remove from queue' src='../images/delete.png'/>" +
                    "<img class='new' alt='New video' title='New video' src='../images/pale_blue_dot.png'/>" +
                    "<span class='expiring'>Expires " + moment(episode.get('expirationDate')).endOf('day').from()+ "</span>");

                listItem.find('a').click(function() {
                    var decomposedTitle = /<b>(.*)<\/b>/.exec(episode.title);
                    var title = decomposedTitle ? decomposedTitle[1] : episode.title;
                    chrome.extension.sendMessage({trackEvent: "click video", eventProperties: {
                        show_id: episode.id,
                        show_name: title,
                        queue_length: queue.length,
                        position: index,
                        fresh: episode.isFresh()
                    }});
                });

                listItem.find('.delete').click(function() {
                    console.log("deleting show");
                    chrome.extension.sendMessage({deleteShow: episode.id});
                    listItem.addClass('deleted');
                    setTimeout(function() {
                        $(list).find('#' + episode.id).remove();
                        if (queueContainer.getElementsByClassName('show').length === 0) {
                            container.className = "empty_queue";
                        }
                    }, 500);
                });
                $(list).append(listItem);
            });

            queueContainer.innerHTML = "";
            queueContainer.appendChild(list);
            resetSeenState(queue);
        } else {
            container.className = "empty_queue";
        }
    }
};
chrome.extension.sendMessage({trackEvent: "open popup"});
