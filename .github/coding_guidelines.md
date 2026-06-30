This is an evolving document. 
Please pay attention and feel free to open a discussion on how this can be improved. :)

## Adding new features
* Always pull from main first before you make any changes.
* Every new branch added should have the following syntax: feature/new-feature-name
* When you do the commit, always try to add the # and number of user story on the kanban. Then it will link to the user story on the kanban. E.g. 'Added coding guidelines #28'
* Only do a pull request once you are fully done with the new feature.
*Once pulled, the branch is as good as dead!

## Writing commit messages (one line vs. many)

For a **short, one-line** message, the normal `-m` is fine:

```bash
git commit -m "Added coding guidelines #28"
```

But `-m "..."` is built for ONE line. If you want a longer message with a title
and a few paragraphs/bullets, you have three safe ways to do it:

### Option 1 — repeat `-m` (easy, good for a few lines)

Each `-m` becomes its own paragraph (git puts a blank line between them):

```bash
git commit -m "Add image pipeline #42" -m "Adds the worklist + ingest scripts." -m "Also refreshes the README."
```

Result:

```text
Add image pipeline #42

Adds the worklist + ingest scripts.

Also refreshes the README.
```

### Option 2 — just `git commit` (opens a text editor)

Run it with **no** `-m` at all:

```bash
git commit
```

Git opens an editor. Type your title on line 1, leave a blank line, then write
the rest. Save and close the editor to finish. (If it opens a scary terminal
editor called `vim`, you type `i` to start typing, then press `Esc` and type
`:wq` then Enter to save and quit.)

### Option 3 — the "heredoc" (best for long messages with special characters)

This is the safest option for big messages, because it protects characters like
`` ` ``, `$`, and quotes from being changed by the terminal. It looks like this:

```bash
git commit -F- <<'EOF'
Add image pipeline #42

Adds the worklist + apply scripts and wires images through graph.js.
- dump-image-worklist.js: makes the CSV for Victoria
- apply-images-to-seed.js: downloads + optimises the images into seed.json
EOF
```

What the weird parts mean:

* `-F-` means "read the commit message from input" (instead of from `-m`).
* `<<'EOF'` says "everything from the next line until you see EOF again is the
  message." **EOF is just a marker word** — it is NOT part of your message, and
  it is NOT a git thing. You could use any word (`<<'MSG' ... MSG` works too);
  EOF is just the common one. It stands for "End Of File".
* The **single quotes** around `'EOF'` are the important safety bit — they stop
  the terminal from messing with symbols inside your message.
* The closing `EOF` must be on its **own line, with nothing else on it** (no
  spaces before it), or the terminal will keep waiting for it.

So the pattern to remember is:

```bash
git commit -F- <<'EOF'
   ...your title here...

   ...your body here...
EOF
```

