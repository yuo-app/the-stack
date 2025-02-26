# The Stack

Full-stack web app template

[![SolidStart](https://img.shields.io/badge/SolidStart-2C4F7C?style=for-the-badge&logo=solid&logoColor=white)](https://start.solidjs.com/)
[![AuthJS](https://img.shields.io/badge/AuthJS-000000?style=for-the-badge&logo=solid&logoColor=white)](https://authjs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-000000?style=for-the-badge&logo=drizzle&logoColor=white)](https://orm.drizzle.team/)
[![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=for-the-badge&logo=turso&logoColor=black)](https://turso.tech/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app/)
[![Bun](https://img.shields.io/badge/Bun-14151A?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

## Features

- **Authentication**: GitHub auth via AuthJS with account linking
- **Database Setup**:
  - Remote Turso DB for authentication
  - Local SQLite WASM DB for client-side data (using sqlocal)
- **ORM**: Drizzle and Drizzle Studio (with local DB sync)
- **Hosting**: Cloudflare Pages

## Future

- **Desktop/Mobile Support**: Tauri
- **DB Sync**: Remote and local DB sync

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and `.dev.vars` and fill them in
3. Install dependencies with `bun i`
4. Run the development server with `bun run dev`

## License

MIT
