import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { AuthState, User, Student, Coach, UserType } from "@/types";

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  selectProfile: (type: "coach" | "student") => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialState: AuthState = {
  status: "checking",
  user: null,
  student: null,
  coach: null,
  userType: null,
  token: null,
  error: null,
};

// Flag externo para evitar llamadas duplicadas a checkAuth
let isCheckingAuth = false;

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        try {
          set({ status: "checking", error: null });

          const { data } = await api.post("/auth/login", { email, password });
          const { token, student, userType, profiles, hasMultipleProfiles } = data;
          
          // Extraer usuario (viene como parte del objeto principal)
          const user = {
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            isActive: data.isActive,
            roles: data.roles,
          };
          
          // Extraer coach de profiles
          const coach = profiles?.coach || null;

          // Guardar token
          localStorage.setItem("token", token);

          // Si tiene múltiples perfiles (coach + student), mostrar selector
          if (hasMultipleProfiles) {
            set({
              status: "select-profile",
              user,
              student: profiles?.student || student || null,
              coach,
              token,
              userType: null,
            });
            return;
          }

          // Determinar tipo de usuario
          let finalUserType: UserType = userType;
          if (!finalUserType) {
            const roles = user.roles?.map((r: { name: string }) => r.name) || [];
            if (roles.includes("superadmin")) finalUserType = "superadmin";
            else if (roles.includes("admin")) finalUserType = "admin";
            else if (roles.includes("coach")) finalUserType = "coach";
            else if (roles.includes("user") && student) finalUserType = "student";
          }

          set({
            status: "authenticated",
            user,
            student: profiles?.student || student || null,
            coach,
            userType: finalUserType,
            token,
            error: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || "Error al iniciar sesión";
          set({
            status: "not-authenticated",
            error: message,
            user: null,
            student: null,
            coach: null,
            token: null,
            userType: null,
          });
          throw new Error(message);
        }
      },

      register: async (email: string, password: string, fullName: string) => {
        try {
          set({ status: "checking", error: null });

          const { data } = await api.post("/auth/register", {
            email,
            password,
            fullName,
          });

          const { token, user } = data;
          localStorage.setItem("token", token);

          set({
            status: "authenticated",
            user,
            student: null,
            coach: null,
            userType: "student", // Por defecto al registrar
            token,
            error: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || "Error al registrarse";
          set({
            status: "not-authenticated",
            error: message,
          });
          throw new Error(message);
        }
      },

      logout: () => {
        // Limpiar todo el localStorage (tokens, stores persistidos, cachés)
        localStorage.clear();
        // Limpiar sessionStorage también
        sessionStorage.clear();
        
        // Resetear estado
        set({
          status: "not-authenticated",
          user: null,
          student: null,
          coach: null,
          userType: null,
          token: null,
          error: null,
        });

        // Forzar recarga para limpiar estados en memoria de otros stores
        window.location.href = "/auth/login";
      },

      checkAuth: async () => {
        const token = localStorage.getItem("token");

        if (!token) {
          set({ status: "not-authenticated" });
          return;
        }

        // Evitar llamadas duplicadas
        if (isCheckingAuth) {
          return; // Ya hay una verificación en progreso
        }
        
        // Si ya estamos autenticados con datos, no volver a verificar
        const currentStatus = get().status;
        if (currentStatus === "authenticated" && get().user) {
          return;
        }

        try {
          isCheckingAuth = true;
          set({ status: "checking" });

          const { data } = await api.get("/auth/check-status");
          const { student, userType, profiles, hasMultipleProfiles } = data;
          
          // Extraer usuario (viene como parte del objeto principal)
          const user = {
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            isActive: data.isActive,
            roles: data.roles,
          };
          
          // Extraer coach de profiles
          const coach = profiles?.coach || null;

          // Si tiene perfil dual y no tiene userType seleccionado, mostrar selector
          const currentUserType = get().userType;
          if (hasMultipleProfiles && !currentUserType) {
            set({
              status: "select-profile",
              user,
              student: profiles?.student || student || null,
              coach,
              token,
              userType: null,
            });
            isCheckingAuth = false;
            return;
          }

          // Determinar tipo de usuario
          let finalUserType: UserType = currentUserType || userType;
          if (!finalUserType) {
            const roles = user.roles?.map((r: { name: string }) => r.name) || [];
            if (roles.includes("superadmin")) finalUserType = "superadmin";
            else if (roles.includes("admin")) finalUserType = "admin";
            else if (roles.includes("coach")) finalUserType = "coach";
            else if (roles.includes("user") && student) finalUserType = "student";
          }

          set({
            status: "authenticated",
            user,
            student: profiles?.student || student || null,
            coach,
            userType: finalUserType,
            token,
            error: null,
          });
        } catch (error) {
          localStorage.removeItem("token");
          set({
            status: "not-authenticated",
            user: null,
            student: null,
            coach: null,
            userType: null,
            token: null,
          });
        } finally {
          isCheckingAuth = false;
        }
      },

      selectProfile: (type: "coach" | "student") => {
        set({
          status: "authenticated",
          userType: type,
        });
      },

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        userType: state.userType,
        token: state.token,
      }),
    }
  )
);

