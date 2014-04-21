chrome.runtime.onMessage.addListener(function(message, sender, sendReponse) {
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

});

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
        var dataURL = canvas.toDataURL('image/png');

        console.log(dataURL);
        console.log(show.thumbnailUrl);
        deferred.resolveWith(this, [show, dataURL]);
    };

    img.src = show.thumbnailUrl.replace('290x160', '435x240');
    console.log(img.src);

    return deferred.promise();
}

function stripHTML(input) {
    var div = document.createElement('div');
    div.innerHTML = input;
    return (div.textContent || div.innerText || input).trim();
}
