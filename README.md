# Quizly

<p align="center">
  <strong>Build quizzes, take them, and review scores in the browser.</strong><br>
  State persists with <code>localStorage</code>. Vanilla HTML, CSS, and JavaScript.
</p>

<p align="center">
  <a href="https://cikeyz.github.io/quizly/">Live Demo</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick Start</a>
  &nbsp;·&nbsp;
  <a href="#project-structure">Structure</a>
  &nbsp;·&nbsp;
  <a href="#license">License</a>
</p>

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=111111">
  <img alt="localStorage" src="https://img.shields.io/badge/Storage-localStorage-0ea5e9">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-22c55e?logo=open-source-initiative&logoColor=white">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/Demo-GitHub%20Pages-222222?logo=github&logoColor=white">
</p>

## Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Other Design Eras](#other-design-eras)
- [License](#license)
- [Course Note](#course-note)

## Overview

Quizly is a single-page quiz platform for instructors and students. Instructors build question sets; students take quizzes and see scores. All data stays in the browser via `localStorage` so the demo runs without a server backend.

## Features

| Feature | Description |
|---------|-------------|
| Roles | Instructor and student flows in one SPA |
| Question builder | Dynamic questions and choices |
| localStorage | Quizzes and results stay on the device |
| Scoring | Immediate results after submit |

## Screenshots

| Landing |
|---------|
| ![Quizly landing](docs/screenshots/landing.png) |

## Quick Start

```bash
git clone https://github.com/cikeyz/quizly.git
cd quizly
python -m http.server 8000
# http://localhost:8000
```

## Project Structure

```text
quizly/
├── index.html
├── script.js
├── style.css
├── LICENSE
├── README.md
└── docs/
    └── screenshots/
        └── landing.png
```

## Other Design Eras

| Branch | Description |
|--------|-------------|
| `overhaul/quiz-maker-v1` | Early Quiz Maker UI |
| `overhaul/warm-editorial` | Warm editorial refresh |
| `overhaul/quizly-zinc` | Zinc / cool rebrand |

## License

MIT. See [LICENSE](LICENSE).

## Course Note

Built for CMPE 364 (Web and Mobile Systems), Polytechnic University of the Philippines, under Engr. Arlene B. Canlas. Published here as a standalone project.
