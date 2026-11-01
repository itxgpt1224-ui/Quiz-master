# PDF MCQ Quiz Maker

A mobile-friendly Progressive Web App (PWA) that extracts MCQs from PDFs, lets you review/edit extraction and answer keys, and runs a quiz.

## Run locally
Serve this folder over HTTPS or localhost. Opening index.html as a file may block PDF.js workers and service workers.

## Publish with GitHub Pages (phone-friendly)
1. Sign in to GitHub and create a **public** repository named `pdf-mcq-quiz`.
2. Upload all files in this folder (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`) to the repository root.
3. In the repository open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
5. Wait for GitHub Pages to publish. Open the Pages URL shown there in Chrome on your Samsung phone.
6. In Chrome tap ⋮ → **Add to Home screen** (or **Install app**, if shown).

## Important limitations
- Extraction is heuristic, not guaranteed for every PDF layout.
- OCR currently uses English (`eng`). It needs internet access to load OCR assets/language data.
- Complex multi-column layouts, tables, handwritten text, unusual fonts, and merged question/option lines may need manual correction.
- Always inspect every extracted question and answer in Review before starting. If a key is missing, tick the correct answer yourself.
- This browser-based app does not upload your PDF to a server; PDF processing happens on your device. External libraries are loaded from CDNs.
- The supplied sample has one-best-answer A-D MCQs, a quick key and detailed explanations. The app supports variable option letters A-E and multiple correct selections when detected or manually marked.
