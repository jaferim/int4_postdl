import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createHashRouter, RouterProvider } from "react-router-dom";
import ItemDetail from "./Components/ItemDetail.jsx";
import ShopDetail from "./Components/ShopDetail.jsx";
import CuratorDetail from "./Components/CuratorDetail.jsx";
import { VaultProvider } from "./lib/vault.jsx";
import { CuratorProvider } from "./lib/curator-state.jsx";
import { LoadingProvider } from "./lib/loading-context.jsx";
import ErrorBoundary from "./Components/ErrorBoundary.jsx";
import RouteError from "./Components/RouteError.jsx";
import NotFound from "./Components/NotFound.jsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { path: "/:itemId", element: <ItemDetail /> },
      { path: "/shops/:shopName", element: <ShopDetail /> },
      { path: "/curators/:slug", element: <CuratorDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <CuratorProvider>
        <VaultProvider>
          <LoadingProvider>
            <RouterProvider router={router} />
          </LoadingProvider>
        </VaultProvider>
      </CuratorProvider>
    </ErrorBoundary>
  </StrictMode>,
);
