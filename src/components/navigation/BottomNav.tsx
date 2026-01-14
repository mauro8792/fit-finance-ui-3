"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Dumbbell, Utensils, TrendingUp, User, Users, CreditCard, LayoutDashboard, Settings } from "lucide-react";
import type { UserType } from "@/types";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const studentNav: NavItem[] = [
  { label: "Inicio", icon: Home, href: "/student" },
  { label: "Rutina", icon: Dumbbell, href: "/student/routine" },
  { label: "Nutrición", icon: Utensils, href: "/student/nutrition" },
  { label: "Progreso", icon: TrendingUp, href: "/student/progress" },
  { label: "Perfil", icon: User, href: "/student/profile" },
];

const coachNav: NavItem[] = [
  { label: "Inicio", icon: Home, href: "/coach" },
  { label: "Alumnos", icon: Users, href: "/coach/students" },
  { label: "Rutinas", icon: Dumbbell, href: "/coach/routines" },
  { label: "Cuotas", icon: CreditCard, href: "/coach/fees" },
  { label: "Perfil", icon: User, href: "/coach/profile" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Alumnos", icon: Users, href: "/admin/students" },
  { label: "Coaches", icon: Dumbbell, href: "/admin/coaches" },
  { label: "Finanzas", icon: CreditCard, href: "/admin/finances" },
  { label: "Config", icon: Settings, href: "/admin/settings" },
];

interface BottomNavProps {
  userType: UserType;
}

export function BottomNav({ userType }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = userType === "student" 
    ? studentNav 
    : userType === "coach" 
      ? coachNav 
      : adminNav;

  const isActive = (href: string) => {
    if (href === "/student" || href === "/coach" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 relative touch-feedback",
                "transition-colors duration-200"
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary to-primary-hover rounded-b-full"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 mb-1 transition-colors",
                  active ? "text-primary" : "text-text-muted"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-text-muted"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

