(function() {
    window.Queue = Backbone.Collection.extend({
        localStorage: new Backbone.LocalStorage("Qulu:queue"),
        model: window.Episode,

        comparator: function(a, b) {
            // A video about to expire comes before one that is not
            if (a.isExpiringSoon() !== b.isExpiringSoon()) {
                return a.isExpiringSoon() ? -1 : 1;
            }

            // If a is expiring soon, b is as well, and if both videos are
            // about to expire, the one that expires first comes first
            if (a.isExpiringSoon()) {
                return (a.get('expirationDate') < b.get('expirationDate')) ? -1 : 1;
            }

            // Then, a new video should show up before a one we know about
            if (a.isFresh() !== b.isFresh()) {
                return a.isFresh() ? -1 : 1;
            }

            // All above being equal, we want to put the most recent shows on top
            if (a.get('airdate') !== b.get('airdate')) {
                return (a.get('airdate') > b.get('airdate')) ? -1 : 1;
            }

            // Finally if everything else is equal, we go by the title
            return (a.get('title') < b.get('title')) ? -1 : 1;
        }
    })
}());
