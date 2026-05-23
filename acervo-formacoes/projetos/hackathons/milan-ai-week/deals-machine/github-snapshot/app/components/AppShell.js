"use client";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { ToastProvider } from "./Toast";

/**
 * AppShell — wraps every cockpit page.
 * Sidebar (left, primary nav) + TopNav (right, settings/profile) + content.
 * Provides the toast context so any descendant can call useToast().
 */
export default function AppShell({ children }) {
  return (
    <ToastProvider>
      <Sidebar />
      <TopNav />
      <main className="md:ml-64 pt-16 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
    </ToastProvider>
  );
}
