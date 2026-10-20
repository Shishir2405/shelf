/**
 * Short descriptions of what each model-sorted folder contains. A text file is compared with
 * these; the folder whose description it resembles most wins. Keep them generic: they are a
 * starting point to be edited by contributors, not a list of test files.
 */
export const PROTOTYPES = {
  Receipts: [
    'a receipt listing items, subtotal, tax and total paid',
    'an invoice with an amount due and a bill-to address',
  ],
  Letters: [
    'a letter or email written to a person with a greeting and a sign-off',
    'a message confirming an appointment or a reply to someone',
  ],
  Recipes: [
    'a cooking recipe with ingredients, quantities and method steps',
    'instructions to bake or cook food in an oven',
  ],
  'Code snippets': [
    'source code with functions, variables and loops',
    'a short program written in a programming language',
  ],
  Notes: [
    'a personal note, reminder, to-do list or idea jotted down',
    'things to remember, plans and thoughts for myself',
  ],
} as const satisfies Record<string, readonly string[]>;
