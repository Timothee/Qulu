(function() {
    window.Queue = Backbone.Collection.extend({
        localStorage: new Backbone.LocalStorage("Qulu:queue"),
        model: window.Episode
    })
}());
