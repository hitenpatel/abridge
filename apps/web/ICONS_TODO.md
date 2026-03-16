# PWA Icons TODO

The PWA configuration requires app icons. These need to be generated from the logo.svg file.

## Required Icons

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

## How to Generate Icons

### Option 1: Using Online Tool
1. Visit https://realfavicongenerator.net/ or https://favicon.io/
2. Upload `/logo.svg`
3. Generate icons for PWA
4. Download and place in `apps/web/public/`

### Option 2: Using ImageMagick
```bash
# Install ImageMagick if not already installed
brew install imagemagick  # macOS
# or: apt-get install imagemagick  # Linux

# Generate icons from logo.svg
cd apps/web/public
convert ../../logo.svg -resize 192x192 icon-192x192.png
convert ../../logo.svg -resize 512x512 icon-512x512.png
```

### Option 3: Using Node.js Sharp
```bash
pnpm add -D sharp

# Create a script to generate icons
node scripts/generate-icons.js
```

## Current Status

⚠️ **Placeholder icons needed**: The manifest.json references these icons, but they don't exist yet.

The PWA will work without icons, but browsers will show a default icon instead of the Abridge logo.

## Optional: Screenshots

For a better install experience, add screenshots:
- `screenshot-1.png` (1280x720) - Dashboard view
- Add to manifest.json screenshots array

## Testing

Once icons are generated, test the PWA:
1. Build the app: `pnpm build`
2. Serve it: `pnpm start`
3. Open in Chrome DevTools > Application > Manifest
4. Verify icons display correctly
5. Click "Install" button in address bar
