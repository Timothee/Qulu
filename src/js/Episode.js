(function() {
    window.Episode = Backbone.Model.extend({
        idAttribute: 'showId',
        defaults: {
            new: true
        }
    });
}());
