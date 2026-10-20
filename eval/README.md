# Text-sorting evaluation

Ten synthetic text files with the folder a person would expect. They are written for this test; they contain no personal data.

Run `npm run eval` to sort them with the real model. The output lists each decision and the accuracy. Results depend on the model and on the prototypes in `src/prototypes.ts`, which were edited while looking at these files. Treat the number as optimistic: this is a development set, not a held-out benchmark.
