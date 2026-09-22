import React from "react";
import { createRoot } from "react-dom/client";
import "typeface-montserrat";
import "typeface-mulish";
import DeleteAccount from "./states/DeleteAccount";

// Deliberately do not import App, NetworkApi, or the stored color-mode provider:
// this email link must never read, initialize, or change the browser's session.
createRoot(document.getElementById("root")).render(<DeleteAccount />);
