#! /bin/bash
cd src/
rm ../Qulu.zip
cp js/mixpanel.prod.js js/mixpanel.js
zip -r ../Qulu.zip\
    js/lib/jquery-2.1.0.min.js\
    js/lib/underscore-min.js\
    js/lib/backbone-min.js\
    js/lib/backbone.localStorage.js\
    js/background.js\
    js/popup.js\
    js/mixpanel.js\
    js/Episode.js\
    js/Queue.js\
    js/options.js\
    css/*\
    images/*.png\
    manifest.json\
    html/*
cp js/mixpanel.dev.js js/mixpanel.js
cd -
