import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "./app/providers/app-provider";
import { client } from "./core/api/query-client";
import { TaskProvider } from "./features/tasks/context/task-provider";
import { Shell } from "./layout/app-shell/app-shell";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Provider>
          <TaskProvider>
            <Shell />
          </TaskProvider>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
