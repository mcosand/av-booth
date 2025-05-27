# AV Booth Control Automation

## Development Server(s)
1. `npm install`
2. Start the backend server on port 1885 with `npm run server`. Updating source in the `server/` directory will restart the server.
3. Start the dev frontend with `npm run dev`. This runs separately from the backend dev server, but proxies `/api` requests to the backend.
4. Launch browser, pointing to http://localhost:3000, or one of the IP addresses displayed in the dev frontend console.


## Create build
1. Build frontend: `npm run build`.
2. Build backend (includes frontend as assets): `npm run build-server`.

Build output is located in the `/dist` folder.

## Setup Raspberry Pi
Uses a Raspberry Pi 3 or later
### Install dependencies
```
sudo apt-get update
sudo apt-get install nodejs nginx
```

### Create workspace
```
cd ~
mkdir av-booth
cd av-booth
npm install atem-connection onoff
# setup config.json
```
### Copy `dist` build folder from dev machine
Probably with scp `scp -r dist user@ip-addr:av-booth`

### Setup pm2 and nginx proxy


# Original React+Vite Docs

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
