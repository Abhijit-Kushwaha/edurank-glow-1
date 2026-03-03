# Vercel Deployment Checklist for Vite + React Router SPA

This checklist ensures your Vite-based React application with React Router deploys and runs correctly on Vercel, avoiding common 404 errors on page refresh.

## 1. Vercel Configuration (`vercel.json`)

- [x] **Create `vercel.json`:** A `vercel.json` file must exist in the root of your project.
- [x] **Add Rewrite Rule:** The file must contain the following rewrite rule to direct all requests to your `index.html`, allowing client-side routing to take over.

  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

## 2. Build Configuration (`vite.config.ts`)

- [x] **Output Directory:** Ensure your Vite build output directory is set to `dist`. This is the default for Vite, so you don't need to specify it unless you've changed it. Vercel automatically detects and uses `dist` for Vite projects.
- [x] **Base Path:** The `base` property in your `vite.config.ts` should be `/` (the default). Only change this if your application is served from a sub-directory.

  Your `vite.config.ts` should look something like this (defaults are fine):

  ```typescript
  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react-swc";

  export default defineConfig({
    plugins: [react()],
    // No need to specify `build.outDir` or `base` if using defaults.
  });
  ```

## 3. React Router Configuration

- [x] **Use `BrowserRouter`:** Your application must use `BrowserRouter` from `react-router-dom` for history-based routing. `HashRouter` is an alternative but is generally not necessary with the `vercel.json` rewrite rule.

  ```tsx
  import { BrowserRouter, Routes, Route } from "react-router-dom";

  function App() {
    return (
      <BrowserRouter>
        <Routes>
          {/* Your routes here */}
        </Routes>
      </BrowserRouter>
    );
  }
  ```

## 4. Vercel Deployment Steps

1.  **Connect Git Repository:** Connect your GitHub, GitLab, or Bitbucket repository to your Vercel account.
2.  **Configure Project:** When setting up your new project on Vercel, use the following settings:
    - **Framework Preset:** Select `Vite`. Vercel will automatically configure the build settings.
    - **Build Command:** Should be automatically set to `npm run build` or `vite build`.
    - **Output Directory:** Should be automatically set to `dist`.
    - **Install Command:** Should be automatically set to `npm install`.
3.  **Deploy:** Click the "Deploy" button.

By following this checklist, your Vite + React Router application should deploy to Vercel without any 404 errors on refresh.
