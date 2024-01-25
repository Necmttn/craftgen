"use client";
import { KBarProvider } from "kbar";

const actions = [
  {
    id: "explore",
    name: "Explore",
    shortcut: ["e"],
    keywords: "explore",
    perform: () => (window.location.pathname = "explore"),
  },
  {
    id: "blog",
    name: "Blog",
    shortcut: ["b"],
    keywords: "writing words",
    perform: () => (window.location.pathname = "blog"),
  },
];

export const KBarProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};
