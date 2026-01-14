"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={cn(
            "rounded-full border-2 border-primary/20",
            sizes[size]
          )}
        />
        {/* Spinning arc */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-transparent border-t-primary",
            sizes[size]
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        {/* Inner pulse */}
        <motion.div
          className={cn(
            "absolute inset-2 rounded-full bg-primary/20",
          )}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      {text && (
        <motion.p
          className="text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Página completa de loading con animación de fitness
export function FullPageLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated dumbbell icon */}
        <div className="relative">
          <motion.div
            className="flex items-center gap-1"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Left weight */}
            <motion.div
              className="w-4 h-8 bg-primary rounded-sm"
              animate={{ scaleY: [1, 0.8, 1] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Bar */}
            <div className="w-12 h-2 bg-primary/60 rounded-full" />
            {/* Right weight */}
            <motion.div
              className="w-4 h-8 bg-primary rounded-sm"
              animate={{ scaleY: [1, 0.8, 1] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          
          {/* Shadow */}
          <motion.div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-primary/10 rounded-full blur-sm"
            animate={{ scaleX: [1, 0.7, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Loading text with dots */}
        <div className="flex items-center gap-1">
          <span className="text-text-muted text-sm">{text}</span>
          <motion.span
            className="flex gap-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 bg-primary rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// Skeleton cards más bonitos
export function RoutineLoadingSkeleton() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Mesocycle card skeleton */}
      <motion.div
        className="h-20 rounded-xl bg-gradient-to-r from-surface via-surface/80 to-surface overflow-hidden"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Microcycle pills skeleton */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="h-10 w-12 rounded-lg bg-surface"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* Days grid skeleton */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-32 rounded-xl bg-surface overflow-hidden"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          >
            <motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.1 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Stats skeleton */}
      <motion.div
        className="h-20 rounded-xl bg-surface/50 overflow-hidden"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
      >
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}

