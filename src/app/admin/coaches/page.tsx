"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAllCoaches, getAllStudents } from "@/lib/api/admin";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  UserPlus,
  ChevronRight,
  Users,
  UserCog,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Coach {
  id: number;
  userId: number;
  user: {
    id: number;
    email: string;
    fullName: string;
    isActive: boolean;
  };
  hasPersonalProfile: boolean;
  paymentAlias?: string;
}

export default function AdminCoachesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [coachesData, studentsData] = await Promise.all([
          getAllCoaches(),
          getAllStudents(),
        ]);
        setCoaches(coachesData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStudentCount = (coachId: number) => {
    return students.filter((s) => s.coachId === coachId && s.isActive).length;
  };

  const filteredCoaches = coaches.filter((coach) => {
    const fullName = coach.user?.fullName?.toLowerCase() || "";
    const email = coach.user?.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Coaches" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Coaches"
        subtitle={`${coaches.length} registrados`}
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/admin/coaches/new")}
            className="text-primary"
          >
            <UserPlus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Buscar coach..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border"
          />
        </div>

        {/* Coaches List */}
        {filteredCoaches.length === 0 ? (
          <div className="py-12 text-center">
            <UserCog className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">Sin resultados</h3>
            <p className="text-sm text-text-muted">
              {searchQuery ? "Probá con otro nombre" : "No hay coaches registrados"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCoaches.map((coach, index) => {
              const studentCount = getStudentCount(coach.id);

              return (
                <motion.div
                  key={coach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className="bg-surface/80 border-border cursor-pointer touch-feedback"
                    onClick={() => router.push(`/admin/coaches/${coach.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-accent/30 to-primary/30 text-text font-medium">
                            {coach.user?.fullName
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-text truncate">
                              {coach.user?.fullName || "Sin nombre"}
                            </h3>
                            {!coach.user?.isActive && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-red-500/20 text-red-400"
                              >
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-text-muted truncate">
                            {coach.user?.email}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {studentCount} alumno{studentCount !== 1 ? "s" : ""}
                            </span>
                            {coach.hasPersonalProfile && (
                              <Badge variant="outline" className="text-xs">
                                Perfil dual
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

