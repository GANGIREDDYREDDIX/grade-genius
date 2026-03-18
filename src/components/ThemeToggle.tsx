import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [iconAnimation, setIconAnimation] = useState<"sun" | "moon" | null>(null);
  const resetIconAnimationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (resetIconAnimationTimeoutRef.current !== null) {
        window.clearTimeout(resetIconAnimationTimeoutRef.current);
      }
    };
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    const nextAnimation = nextTheme === "light" ? "sun" : "moon";

    setIconAnimation(nextAnimation);
    if (resetIconAnimationTimeoutRef.current !== null) {
      window.clearTimeout(resetIconAnimationTimeoutRef.current);
    }
    resetIconAnimationTimeoutRef.current = window.setTimeout(() => {
      setIconAnimation(null);
    }, 650);

    setTheme(nextTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-xl border-border/70 hover-lift cinematic-row"
    >
      {isDark ? (
        <Moon className={cn("h-4 w-4 theme-icon text-indigo-400", iconAnimation === "moon" && "theme-icon-moon-anim")} />
      ) : (
        <Sun className={cn("h-4 w-4 theme-icon text-amber-500", iconAnimation === "sun" && "theme-icon-sun-anim")} />
      )}
    </Button>
  );
};

export default ThemeToggle;
