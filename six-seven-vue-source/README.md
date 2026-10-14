# 6-7 local preview

Open `dist/index.html` to read the publication directly from disk. Its text is included in `dist/content/publication.js`, so the page no longer needs a content request.

For the camera gesture, double-click `preview.command` and keep its Terminal window open. This serves the same page at `http://127.0.0.1:8767/`, where the browser can request camera access. The gesture detector still needs an internet connection to load MediaPipe.
