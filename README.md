# ScriptGuard AI

Micro-SaaS developed by **Abdelati Zarzori**.

ScriptGuard AI is a browser-based code review workspace for inspecting source files, viewing security and quality findings, translating Python comments and string literals, and packaging local files as ZIP archives. The interface supports Arabic RTL presentation and keeps file-manager operations local to the browser.

## Current capabilities

The Python translator processes comments and quoted string literals while preserving Python keywords, identifiers, operators, indentation, and file structure. The file manager accepts multiple files or a complete directory, preserves relative paths, provides local read/edit/save controls for text files, and creates a downloadable ZIP without automatic upload.

The code-analysis screen can use the configured API when available. If the API cannot be reached, the interface falls back to clearly labelled local demonstration data; demonstration results must not be treated as a real security audit.

## Run locally

Serve the repository with any static HTTP server, for example:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`. The project currently uses CDN dependencies for Tailwind CSS, Prism, Font Awesome, and JSZip, so an internet connection is required for the full visual experience.

## API configuration

The current frontend defaults to `http://localhost:3000`. For another deployment, set the runtime configuration before loading the page or update the API configuration in `app.js` to point to a server that implements the documented analysis and authentication routes. Never place API keys, passwords, or provider credentials in this repository or in browser code.

## Privacy and safety

Files selected in the ZIP manager remain in browser memory and are not uploaded automatically. Editing a file changes only the in-memory ZIP item until the user downloads the archive. Do not upload secrets, private keys, production credentials, or confidential source code to an analysis service unless the deployment's privacy policy and server configuration have been reviewed.

## Developer

**Abdelati Zarzori** — product owner and lead developer.

## License

Add a project license before public redistribution.
