"use client";

import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full transition-colors duration-200 
        text-zinc-600 dark:text-zinc-400 
        hover:text-orange-500 dark:hover:text-orange-500 
        hover:bg-zinc-100 dark:hover:bg-zinc-800 
        focus:outline-none focus:ring-2 focus:ring-orange-500/50
        ${className}`}
      aria-label="Toggle Dark Mode"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}