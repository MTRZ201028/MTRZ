# QR Generator & Scanner Web App

Production-ready single-page web app for:
- Generating QR codes from text/URLs
- Scanning QR codes using device camera
- Decoding QR codes from uploaded images

## Tech Stack

- HTML + CSS + Vanilla JavaScript
- `qrcodejs` for QR generation
- `html5-qrcode` for camera scanning (lazy-loaded)
- `jsQR` for reliable image upload decoding with preprocessing

## Run Locally

Use any static local server (camera access may require localhost/https):

### Option 1 (VS Code / Cursor)
- Use **Live Server** extension
- Open `index.html` through Live Server

### Option 2 (Node)
```bash
npx serve .
```

### Option 3 (Python)
```bash
python -m http.server 8080
```

Then open:
- `http://localhost:8080`

## Production Deployment

This app is static and can be deployed to:
- Netlify
- Vercel (static)
- Cloudflare Pages
- GitHub Pages
- Any Nginx/Apache static hosting

Deploy all files in the project root as-is.

## Notes

- Update social meta placeholders in `index.html`:
  - `og:url`
  - `og:image`
  - `twitter:image`
- Camera scanning depends on browser permission and available camera device.

## Quality Checklist

- No debug `console.log` statements
- Clear error/success/empty states
- Responsive UI (mobile/tablet/desktop)
- Keyboard-accessible tab navigation
- Defensive input/file validation
