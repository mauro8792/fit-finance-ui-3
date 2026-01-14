"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAllFees, getAllStudents } from "@/lib/api/admin";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
} from "lucide-react";
import { cn, formatDate, parseLocalDate } from "@/lib/utils";
import type { Fee, Student } from "@/types";

export default function AdminFeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [feesData, studentsData] = await Promise.all([
          getAllFees(),
          getAllStudents(),
        ]);
        setFees(feesData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStudentName = (studentId: number) => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Alumno";
  };

  const filteredFees = fees.filter((fee) => {
    const studentName = getStudentName(fee.studentId).toLowerCase();
    const matchesSearch =
      studentName.includes(searchQuery.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterMonth !== "all") {
      const feeDate = parseLocalDate(fee.dueDate);
      if (!feeDate) return false;
      const [year, month] = filterMonth.split("-");
      if (
        feeDate.getFullYear() !== parseInt(year) ||
        feeDate.getMonth() !== parseInt(month) - 1
      ) {
        return false;
      }
    }

    return matchesSearch;
  });

  const pendingFees = filteredFees.filter(
    (f) => f.status === "pending" || f.status === "overdue" || f.status === "partial"
  );
  const paidFees = filteredFees.filter((f) => f.status === "paid");

  const totalPending = pendingFees.reduce(
    (sum, f) => sum + ((f.amount || 0) - (f.amountPaid || 0)),
    0
  );
  const totalCollected = paidFees.reduce((sum, f) => sum + (f.amount || 0), 0);

  // Get unique months for filter
  const months = Array.from(
    new Set(
      fees.map((f) => {
        const date = parseLocalDate(f.dueDate);
        if (!date) return "";
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }).filter(Boolean)
    )
  ).sort().reverse();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cuotas" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Cuotas"
        subtitle="Gestión global"
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/admin/fees/new")}
            className="text-primary"
          >
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-text">
                ${totalPending.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">Pendiente</p>
            </CardContent>
          </Card>
          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
              <p className="text-xl font-bold text-text">
                ${totalCollected.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">Cobrado</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32 bg-surface border-border">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {months.map((month) => {
                const [y, m] = month.split("-");
                const date = new Date(parseInt(y), parseInt(m) - 1);
                return (
                  <SelectItem key={month} value={month}>
                    {date.toLocaleDateString("es-AR", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-surface border border-border">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              Pendientes ({pendingFees.length})
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="data-[state=active]:bg-success data-[state=active]:text-black"
            >
              Pagadas ({paidFees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {pendingFees.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-text-muted">No hay cuotas pendientes</p>
                </CardContent>
              </Card>
            ) : (
              pendingFees.map((fee, index) => {
                const isOverdue = fee.status === "overdue";
                const remaining = (fee.amount || 0) - (fee.amountPaid || 0);

                return (
                  <motion.div
                    key={fee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card
                      className={cn(
                        "bg-surface/80 border-border cursor-pointer touch-feedback",
                        isOverdue && "border-red-500/30"
                      )}
                      onClick={() => router.push(`/admin/fees/${fee.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                isOverdue ? "bg-red-500/20" : "bg-yellow-500/20"
                              )}
                            >
                              {isOverdue ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <Clock className="w-5 h-5 text-yellow-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-text text-sm">
                                {getStudentName(fee.studentId)}
                              </p>
                              <p className="text-xs text-text-muted">
                                {fee.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-text">
                              ${remaining.toLocaleString()}
                            </p>
                            <p className="text-xs text-text-muted">
                              {formatDate(fee.dueDate, {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-4 space-y-2">
            {paidFees.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted">No hay cuotas pagadas</p>
                </CardContent>
              </Card>
            ) : (
              paidFees.slice(0, 30).map((fee, index) => (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="bg-surface/80 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium text-text text-sm">
                              {getStudentName(fee.studentId)}
                            </p>
                            <p className="text-xs text-text-muted">
                              {fee.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-text">
                            ${(fee.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-text-muted">
                            {formatDate(fee.paidDate || fee.dueDate)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

