# Northfield Bible Church website

Static rebuild of [northfieldbiblechurch.org](https://northfieldbiblechurch.org/) with Astro.

## Develop

```bash
npm install
npm run dev
```

## Import sermon and study archives

Pull metadata from the live Website Tonight pages (does not download MP3 files):

```bash
npm run import:archives
```

## Build

```bash
npm run build
npm run preview
```

Audio and video links continue to point at the existing host until media is migrated.
