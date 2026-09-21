# GIMSUGA Ebonyi State chapter: website prototype

A clickable prototype of the chapter website, shown to the chapter executive and members before anything
is built for real. It behaves like the real site: visitors see the public pages, members sign in to see the
member directory and their profile, and admins also see Manage, where drafts are checked and published.

Live at https://gimsuga.github.io/prototypes/ (hidden from search engines).

## Rules for everything in this repository

This repository is public, and git history is permanent. Everything here must be safe to publish forever.

- **Made-up people only.** Every name, business and event is invented. No real member, officer or
  photograph of a real person, ever.
- **Nothing leaves the browser.** Signing in needs no password: "Sign in" offers a member account and an
  admin account. Anything typed is kept in the visitor's own browser storage.
- **Hidden from search engines** on every page (`noindex`); the build fails if a page is missing it.
- **No tracking, cookies or embeds.** No WhatsApp links; the build fails if one appears.
- **Nothing from the planning workspace comes in:** no research notes, questionnaire responses, contact
  details, secrets, `.env` files or machine paths.
- **Footer:** "© <year> GIMSUGA Ebonyi State chapter", year from the build.

## How it is built

- [Hugo](https://gohugo.io/) 0.166.0, built and published by GitHub Actions (`.github/workflows/pages.yml`).
  Nothing is built on a developer's machine.
- Chapter facts, people, events and navigation live in `data/`. Templates never repeat them.
- The "Get started" tour uses [Driver.js](https://driverjs.com/) 1.8.0 (MIT), vendored in
  `assets/vendor/driver/` with its licence and source record.
- Mobile first: a tab bar at the bottom on phones, a top menu from 900px.

Built with AI-assisted development (Claude Code).
