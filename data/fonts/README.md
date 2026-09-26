# Bundled fonts

- **Noto Sans Thai Regular/Bold**: https://github.com/google/fonts/tree/main/ofl/notosansthai
  - Static instances of NotoSansThai[wdth,wght].ttf, generated with fontTools varLib.instancer (wdth=100, wght=400/700).
  - Thai and Latin coverage; license: OFL-Noto.txt.
- **Chakra Petch Bold**: https://github.com/google/fonts/tree/main/ofl/chakrapetch
  - Used for the brand and numeric score; license: OFL-ChakraPetch.txt.
- Existing Sarabun files are retained from the original project but are no longer the active UI font.

The runtime uses the bundled static TTF files and does not download fonts.
