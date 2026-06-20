# Generate PWA Icons

The PWA manifest requires PNG icons at 192×192 and 512×512 pixels.
SVG source files are provided in `public/icons/` as design templates.

## Required icon files

Place these PNG files in `public/icons/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192x192.png` | 192×192 | Standard icon for PWA install prompt |
| `icon-512x512.png` | 512×512 | Splash screen and large icon |
| `icon-192x192-maskable.png` | 192×192 | Maskable icon (safe zone: inner 80%) |
| `icon-512x512-maskable.png` | 512×512 | Maskable icon (safe zone: inner 80%) |

## Design specification

- **Symbol**: White "P" letter (Poppins Bold)
- **Background**: Blue-to-purple gradient (`#2563EB` → `#7C3AED`, 135° angle)
- **Corners**: Rounded (the OS handles masking, so use square PNGs with the gradient filling the entire canvas)
- **Maskable icons**: Same design, but ensure the "P" stays within the inner 80% safe area

## Generate from SVG (using sharp/node)

```bash
npx sharp-cli -i public/icons/icon-192x192.svg -o public/icons/icon-192x192.png --width 192 --height 192
npx sharp-cli -i public/icons/icon-512x512.svg -o public/icons/icon-512x512.png --width 512 --height 512
```

## Or using Inkscape CLI

```bash
inkscape public/icons/icon-192x192.svg --export-filename=public/icons/icon-192x192.png --export-width=192 --export-height=192
inkscape public/icons/icon-512x512.svg --export-filename=public/icons/icon-512x512.png --export-width=512 --export-height=512
```

## Or using any image editor

Open the SVG files and export as PNG at the specified dimensions.
For maskable variants, use the same design but ensure the P letter is scaled to fit within the inner 80% circle.
