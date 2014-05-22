(function() {
    var DAYS_BEFORE_EXPIRATION_WARNING = 3;

    window.Episode = Backbone.Model.extend({
        idAttribute: 'showId',

        isExpiringSoon: function() {
            return moment(this.get('expirationDate')).diff(moment(), 'days') < DAYS_BEFORE_EXPIRATION_WARNING;
        },

        isFresh: function() {
            return Boolean(this.get('fresh'));
        }
    });
}());
