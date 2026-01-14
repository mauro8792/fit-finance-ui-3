"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  actions?: {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    variant?: "default" | "destructive";
  }[];
  rightContent?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  showBack,
  backHref,
  onBack,
  actions,
  rightContent,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  // Show back button if explicitly set, or if backHref/onBack is provided
  const shouldShowBack = showBack ?? (!!backHref || !!onBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
        {/* Back button */}
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2 text-text-secondary hover:text-text"
            onClick={handleBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-text-muted truncate">{subtitle}</p>
          )}
        </div>

        {/* Right content or actions */}
        {rightContent}
        
        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -mr-2">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface border-border">
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    "cursor-pointer",
                    action.variant === "destructive" && "text-error focus:text-error"
                  )}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

