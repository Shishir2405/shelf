# Shelf

**An offline file tidier. Rules sort what they can, a small open-weight model sorts the text files, and nothing moves until you say so.**

Your Downloads folder is a pile you keep meaning to deal with. Shelf does it for you: it sorts the top level of a folder into tidy subfolders, works without an internet connection, and keeps a log so every run can be undone.

## How it decides

1. **Rules first.** Extensions like `.pdf`, `.jpg` and `.zip` go to fixed folders (`Documents`, `Images`, `Archives`…). Rules are deterministic and cost nothing.
2. **Model for text.** Plain-text files (`.txt`, `.md`, `.rtf`, no extension) have no useful extension, so their first 1,000 characters are compared with short descriptions of each folder. The model is [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2), a sentence embedder, **Apache-2.0**, about 25 MB at 8-bit. Descriptions live in [`src/prototypes.ts`](src/prototypes.ts).
3. **Unsure means Unsorted.** The model must prefer one folder by a clear margin (`MIN_MARGIN` in [`src/decide.ts`](src/decide.ts)). Otherwise the file goes to `Unsorted`. Anything the model names outside the allowed list is discarded.

## Safety

- **Dry run by default.** Nothing moves without `--apply`.
- **Never deletes or overwrites.** A name clash becomes `report (2).pdf`. Moves are made with a hard link that fails if the target exists, and the original is removed only after that succeeds.
- **Top level only.** Hidden files, folders and symlinks are never touched.
- **Undo.** Every applied run is logged in `.shelf-log.json` in the folder. `shelf undo <folder>` reverses the last run. Anything that cannot be restored safely is reported and left alone.

## Run it

Requires Node.js 20 or newer.

```bash
npm ci
npm run build

node dist/cli.js ~/Downloads                 # dry run: shows the plan
node dist/cli.js ~/Downloads --apply         # moves files
node dist/cli.js undo ~/Downloads            # reverses the last --apply
node dist/cli.js ~/Downloads --no-model      # rules only, no model download
```

The first run that uses the text model downloads it to `~/.cache/shelf/models`. After that, no network is needed. Use `--model-dir` to choose another location.

## Measured behaviour

`npm run eval` sorts ten synthetic text files in [`eval/samples`](eval/samples) with the real model:

- **7 of 10 correct**, 2 sent to Unsorted, 1 wrong (a line of code containing the word "total" was filed as a receipt).
- This is a development set. The prototypes were edited while looking at these files, so the number is optimistic. There is no held-out benchmark yet.

Smaller chat models were tried first and did worse on the same files:

| Approach                      | Model                               | Correct (of 10) |
| ----------------------------- | ----------------------------------- | --------------- |
| Pick a numbered folder        | Qwen2.5-0.5B-Instruct (q8, ~500 MB) | 2               |
| Score folder names            | Qwen2.5-0.5B-Instruct (q8, ~500 MB) | 3               |
| Score folder names            | Qwen2.5-1.5B-Instruct (q8, ~1.6 GB) | 2               |
| Prototype similarity + margin | all-MiniLM-L6-v2 (q8, ~25 MB)       | 7 (2 unsorted)  |

Images, videos and other binary files are not read at all. They are sorted by extension only.

## Privacy

Shelf reads file contents only for text files and only the first 1,000 characters, and only on your machine. It sends nothing anywhere. Its log lives in the folder it sorted.

## Limitations

- Top level of one folder only. No recursion.
- Text sorting is about 70% accurate on the development set. Expect some files in `Unsorted` and occasional wrong guesses. Review the dry run first.
- The folder list is fixed in code. Adding folders means editing `src/categories.ts` and `src/prototypes.ts`.
- Only tested with Node.js on macOS. Not tested on Windows.

## Development

```bash
npm test            # unit and integration tests, no model download
npm run validate    # typecheck, lint, format check, tests, build
npm run eval        # real model on eval/samples (downloads ~25 MB once)
```

CI runs `npm run validate` and never downloads the model.

## License

Apache-2.0. The model is Apache-2.0 from its authors (see links above).
