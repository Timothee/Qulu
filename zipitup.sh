#! /bin/bash
cp mixpanel.prod.js mixpanel.js
zip -r Qulu.zip background.js font.css images/*.png manifest.json mixpanel.js popup.*
cp mixpanel.dev.js mixpanel.js
