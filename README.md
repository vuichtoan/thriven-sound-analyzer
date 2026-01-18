# 🎵 Thriven Sound Analyzer

Offline-first CLI für **Suno-Exports** (Loops/Stems) und **8-Stem Packs** (BR-864 / Ableton).  
Ziel: **scannen → analysieren → ranken → Top-N exportieren** und zusätzlich **8-Stem-Ordnung + BR-864-ready WAVs** erzeugen.

## Funktionen (was es allgemein können sollte)

- `thriven scan` — Ordner scannen, Metadaten + SHA-256 Dupe-Check (`raw_index.json`)
- `thriven analyze` — LUFS/Peak/RMS + Silence% (ffmpeg) (`analysis_index.json`)
- `thriven export` — Ranking + Top-N Export + Report (`exports/`)
- `thriven process` — All-in-one Pipeline
- `thriven stemmap` — Mapping-Template aus Suno-Stems erzeugen (BPM Range 90–190)
- `thriven apply-stemmap` — erzeugt `stems_8/` (01..08, Slot 08 = Vocals/Backing Vocals)
- `thriven prep-br864` — konvertiert `stems_8/` → `br864_ready/` (44.1kHz, 16-bit WAV, optional Padding/Trim) + Manifest

## Voraussetzungen

- Node.js 18+
- ffmpeg + ffprobe im PATH

macOS:
```bash
brew install node ffmpeg
```

Debian/Ubuntu/Raspberry Pi:
```bash
sudo apt update && sudo apt install -y nodejs ffmpeg
```

## Install

```bash
npm install
npm link
thriven --help
```

## Suno → Ableton → BR-864 (empfohlen)

1) Pack-Ordner:
```
PACK/
  stems_raw/
    (Suno-Stems hier)
```

2) Mapping & 8 Slots:
```bash
thriven stemmap PACK --title "SunoPack_Week01"
# stemmap.yaml öffnen → slot/type/bpm/key/title setzen
thriven apply-stemmap PACK
```

3) BR-864 Prep (gleich lange Files = Alignment):
```bash
thriven prep-br864 PACK --pad-to-longest
```

### Suno gleiche Länge bei Stems – gut?
Ja, für Ableton ist das **meist ein Vorteil**: alle Stems sind sofort sauber aligned.
Wenn Längen doch abweichen, macht `--pad-to-longest` sie gleich.
