# companion-module-duonn-atrium

Bitfocus Companion module for Duonn Atrium digital mixers (Atrium 20). Mute, faders, DCA, input gain and channel EQ, with live feedback from the console.

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE).

## Development

- `yarn` installs the dependencies, `yarn build` compiles to `dist/`, `yarn dev` recompiles on change.
- `yarn package` builds the `.tgz` that Companion imports (Modules → Import module package).

The protocol notes (frame format, parameter ids, value scales) are in `src/protocol.ts`.
