# Ruuvi Station Web UI

Source code for [station.ruuvi.com](https://station.ruuvi.com), the web application for managing [Ruuvi sensors](https://ruuvi.com) in Ruuvi Cloud.

Built with [React](https://react.dev) and [Vite](https://vite.dev). Translations come from the [station.localization](https://github.com/ruuvi/station.localization) submodule.

## Development

Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm start
```

The development server runs at http://localhost:5173. Sign in with your Ruuvi Cloud account.

The email confirmation page is available at `/delete-account?token=XXXX`. It has a separate entry point and is built to `build/delete-account/index.html` for static hosting. It uses only the email token and does not initialize the signed-in application or access its session. Deletion starts only after the visitor acknowledges the permanent action and presses **Delete account**.

## License

Licensed under the [BSD 3-Clause License](LICENSE). Copyright © Ruuvi Innovations Ltd.
