# NUJRA Website

This is the official NUJRA static website for GitHub Pages.

The live site is served from the repository root. Archived versioned folders such as `v43/` are kept for history and should not be edited for normal production updates.

## Site Structure

- Root pages: `index.html`, `about.html`, `members.html`, `resources.html`, `join.html`, and `contact.html`
- Resource articles: `resources/*.html`
- Shared styles: `css/style.css`
- Shared scripts: `js/main.js`
- Shared data: `data/*.json`
- Shared images: `images/`
- Hero images: `images/hero/`

Google Forms are used for admission, contact, and leave/unsubscribe forms.

Hero image rotation is manually managed. New hero images must be uploaded to `images/hero/` and manually added to `HERO_IMAGES` in `js/main.js`.

## Deployment Notes

This is a static HTML/CSS/JS site for GitHub Pages.

The root `CNAME` file configures the custom domain:

```text
nujra-chicago.org
```

The root `.nojekyll` file is kept so GitHub Pages serves static assets without Jekyll processing.

## Verification Checklist

- Open `index.html`
- Check navigation links
- Check resources links
- Check member photos
- Check Google Form buttons
- Check hero image rotation
- Check pages under `resources/`
