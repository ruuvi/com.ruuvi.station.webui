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

Visit `/demo` to explore without an account or Ruuvi Cloud connection. The 22 sample sensors include a RuuviTag and a Ruuvi Air with all selectable fields visible. Each sample has 90 days of locally generated history. Graphs, comparisons, exports, units, alerts, sensor edits, and simulated sharing use the normal application screens. No demo changes or emails are sent to Ruuvi Cloud.

Demo changes are stored separately in the current tab's session storage and survive reloads. **Reset demo** restores the samples; **Exit demo** returns to the normal app without changing your signed-in session. Account deletion and plan activation are unavailable in the demo.

The build includes `build/demo/index.html` for static hosting at `/demo/`. As with the rest of the app, configure your static host to serve `index.html` for client-side deep links such as `/demo/compare` or `/demo/D0:DE:00:00:00:01`.

## License

Licensed under the [BSD 3-Clause License](LICENSE). Copyright © Ruuvi Innovations Ltd.
