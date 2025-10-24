This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Azure Progress API Setup

See `../docs/azure-progress-api.md` for a full backend blueprint.

The frontend now talks to an Azure-hosted progress service instead of Firebase when the following environment variables are present (see `.env.local.example`):

```
REACT_APP_PROGRESS_API_BASE=https://<your-functions-app>.azurewebsites.net/api
REACT_APP_PROGRESS_API_KEY=<optional-functions-key>
REACT_APP_ADMIN_EMAILS=comma,separated,list,@or-domains
```

1. Copy `.env.local.example` to `.env.local` and fill in the values for your environment.
2. Restart the React dev server after editing env files; Create React App only reads them on startup.
3. The frontend expects the Azure API to expose:
   - `GET /users/{id}` → returns a document containing at least `pagesProgress`, `pageSlug`, `developerMode`, `editorContent`.
   - `PATCH /users/{id}` → merges the posted JSON into the stored user document.
   - `GET /admin/progress` → returns either an array or object with `users` array; each entry should expose `userId`/`email` and `pagesProgress`.

If these variables are omitted the app will fall back to the legacy Firebase implementation (or local storage only if Firebase is disabled).

### Quick local test workflow

1. Run the Azure Functions progress API locally with `REACT_APP_PROGRESS_API_BASE` pointing to the emulator URL (for example `http://localhost:7071/api`).
2. Populate your backing data store (e.g. Cosmos DB or the emulator) with sample progress documents.
3. From `frontend/`, run `npm install` and `npm start`.
4. Sign in as a learner and navigate course content to confirm progress updates.
5. Open `#admin` (or use the Admin Dashboard link) with an admin user to verify cross-user summaries.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
