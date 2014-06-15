window.onload = function () {
    var container = document.getElementById("container");
    var queueContainer = document.getElementById("queue");
    var queue = new Queue();
    queue.fetch();

    if (localStorage["Qulu:loggedIn"] == "false") {
        container.className = "logged_out";
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

                if (showReviewRequest(index)) {
                    $(list).append('<li class="love-qulu love-qulu-' + (index % 3) + '" data-index="' + index + '">' +
                            '<a href="https://chrome.google.com/webstore/detail/qulu-%E2%80%93-your-hulu-queue/iggfkakbafpkgjaocfjaoehcclhcjckb/reviews" target="_BLANK">Love Qulu? Click to leave a review!</a>' +
                            '</li>');
                }
            });

            queueContainer.innerHTML = "";
            queueContainer.appendChild(list);
            chrome.extension.sendMessage({resetSeenState: true});
        } else {
            container.className = "empty_queue";
        }
    }
    $('.love-qulu').click(loveQuluClick);
    chrome.extension.sendMessage({trackEvent: "open popup"});
};

function loveQuluClick(e) {
    chrome.extension.sendMessage({trackEvent: "love qulu", eventProperties: {position: $(e.target).parent().data('index')}});
}

function showReviewRequest(index) {
    // Shown if never clicked and you opened the popup at least 10 times
    // After that, shown every three times you open the popup and
    // one line every 7 episodes in the popup
    return localStorage['Qulu:event:love qulu'] === undefined &&
        localStorage['Qulu:event:open popup'] >= 10 &&
        localStorage['Qulu:event:open popup']%3 === 0 &&
        (index - 2) % 7 === 0;
}
