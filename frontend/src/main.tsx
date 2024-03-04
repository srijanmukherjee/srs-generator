import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/Home.tsx";
import DomainPage from "./pages/Domain.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
        loader: async ({ request }) => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/domains`,
                { signal: request.signal }
            );
            if (!response.ok) {
                throw new Error("Internal server error");
            }
            return await response.json();
        },
    },
    {
        path: "/domains/:slug",
        element: <DomainPage />,
        loader: async ({ request, params }) => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/domains/${params.slug}`,
                { signal: request.signal }
            );
            if (!response.ok) {
                throw new Error("Not found");
            }
            return await response.json();
        },
    },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
