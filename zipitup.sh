#! /bin/bash
cd src/
rm ../Qulu.zip
cp js/mixpanel.prod.js js/mixpanel.js
zip -r ../Qulu.zip js/background.js js/popup.js js/mixpanel.js js/lib/*.js css/* images/*.png manifest.json html/*
cp js/mixpanel.dev.js js/mixpanel.js
cd -
