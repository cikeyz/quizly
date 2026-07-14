# Quizly

Build quizzes, take them as a student, and review scores in the browser. State persists with `localStorage`. Vanilla HTML, CSS, and JavaScript.

## Features

| Feature | Description |
|---------|-------------|
| Roles | Admin and student flows in one SPA |
| Question builder | Dynamic questions and choices |
| localStorage | Quizzes and results stay on the device |
| Scoring | Instant results after submit |

## Quick start

```bash
python -m http.server 8000
```

## Structure

```text
quizly/
  index.html
  script.js
  style.css
```

## Other design eras

Long-lived branches (not merged into `main`):

| Branch | Era |
|--------|-----|
| `overhaul/quiz-maker-v1` | Early Quiz Maker UI |
| `overhaul/warm-editorial` | Warm editorial refresh |
| `overhaul/quizly-zinc` | Zinc / cool rebrand |

`main` is the current Quizly bento UI.

## License

MIT. See [LICENSE](LICENSE).

## Course note

Built for CMPE 364 (Web and Mobile Systems), Polytechnic University of the Philippines, under Engr. Arlene B. Canlas. Published here as a standalone project.
