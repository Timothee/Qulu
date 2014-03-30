#! /bin/bash
cd src/
rm ../Qulu.zip
cp js/mixpanel.prod.js js/mixpanel.js
zip -r ../Qulu.zip js/background.js css/font.css images/*.png manifest.json js/mixpanel.js html/popup.*
cp js/mixpanel.dev.js js/mixpanel.js
cd -
