# Vocabulary source data

Copied unchanged from data/ in the `python-v1-archive` Git tag.

- `cefr_dictionary.json`: word lists and inherited level labels.
- `en_th.json`: Thai glosses.

Run `npm run data:build` from Web/ to regenerate public/data/. Both source files are kept here so the web build and vocabulary generator work without the Python project.

Original data scripts, CSV inputs and their context remain available at https://github.com/BeelzebubCode/snake-game/tree/python-v1-archive/data. Existing provenance and review caveats are in ../public/data/README.md.
