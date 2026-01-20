"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAllStudents, getAllCoaches } from "@/lib/api/admin";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  UserPlus,
  ChevronRight,
  Filter,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student } from "@/types";

interface Coach {
  id: number;
  userId: number;
  user: {
    fullName: string;
  };
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsData, coachesData] = await Promise.all([
          getAllStudents(),
          getAllCoaches(),
        ]);
        setStudents(studentsData);
        setCoaches(coachesData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesCoach =
      filterCoach === "all" || student.coachId?.toString() === filterCoach;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && student.isActive) ||
      (filterStatus === "inactive" && !student.isActive);

    return matchesSearch && matchesCoach && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Alumnos" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Alumnos"
        subtitle={`${students.length} registrados`}
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/admin/students/new")}
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
            placeholder="Buscar alumno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterCoach} onValueChange={setFilterCoach}>
            <SelectTrigger className="flex-1 bg-surface border-border">
              <UserCog className="w-4 h-4 mr-2 text-text-muted" />
              <SelectValue placeholder="Coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los coaches</SelectItem>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id.toString()}>
                  {coach.user?.fullName || `Coach ${coach.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-surface border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">Sin resultados</h3>
            <p className="text-sm text-text-muted">
              {searchQuery || filterCoach !== "all" || filterStatus !== "all"
                ? "Probá con otros filtros"
                : "No hay alumnos registrados"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="bg-surface/80 border-border cursor-pointer touch-feedback"
                  onClick={() => router.push(`/admin/students/${student.id}/edit`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback
                          className={cn(
                            "text-text text-sm",
                            student.isActive
                              ? "bg-gradient-to-br from-primary/30 to-accent/30"
                              : "bg-surface"
                          )}
                        >
                          {student.firstName?.[0]}
                          {student.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-text truncate">
                            {student.firstName} {student.lastName}
                          </h3>
                          {!student.isActive && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-red-500/20 text-red-400"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">
                          {student.user?.email || ""}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

