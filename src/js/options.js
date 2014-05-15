
window.onload = function() {
    var notificationsSetting = Boolean(localStorage['Qulu:options:notifications'] === 'true');
    if (notificationsSetting) {
        $('input#notifications').attr('checked', 'checked');
    } else {
        $('input#notifications').removeAttr('checked');
    }

    $('input#notifications').click(function(e) {
        var checkbox = e.target;

        localStorage['Qulu:options:notifications'] = Boolean(checkbox.checked);
        if (checkbox.checked === false) {
            chrome.notifications.getAll(function(notifications) {
                _.each(notifications, function(value, notification) {
                    chrome.notifications.clear(notification, function() {});
                });
            });
        }
    });
};
