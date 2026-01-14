"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Wallet,
  DollarSign,
  Save,
  Loader2,
  Info,
  Copy,
  Check,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentConfig {
  paymentAlias: string;
  paymentNotes: string;
  defaultFeeAmount: number | null;
}

interface PlanPrice {
  id: number;
  name: string;
  sport?: { name: string };
  weeklyFrequency: number;
  defaultPrice?: number;
  coachPrice?: number | string;
}

export default function PaymentSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<PaymentConfig>({
    paymentAlias: "",
    paymentNotes: "",
    defaultFeeAmount: null,
  });
  
  // Precios por plan
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadingPlans(true);
        
        // Cargar configuración del coach y precios por plan en paralelo
        const [coachRes, plansRes] = await Promise.all([
          api.get("/coaches/me"),
          api.get("/fee/coach/plan-prices").catch(() => ({ data: [] })),
        ]);
        
        setConfig({
          paymentAlias: coachRes.data.paymentAlias || "",
          paymentNotes: coachRes.data.paymentNotes || "",
          defaultFeeAmount: coachRes.data.defaultFeeAmount || null,
        });
        
        setPlanPrices(plansRes.data || []);
      } catch (error) {
        console.error("Error loading config:", error);
        toast.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
        setLoadingPlans(false);
      }
    };

    loadData();
  }, []);

  const handlePlanPriceChange = (planId: number, price: string) => {
    setPlanPrices((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, coachPrice: price } : p))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Guardar configuración general
      await api.patch("/coaches/me/payment-config", {
        paymentAlias: config.paymentAlias || null,
        paymentNotes: config.paymentNotes || null,
        defaultFeeAmount: config.defaultFeeAmount ? Number(config.defaultFeeAmount) : null,
      });
      
      // Guardar precios por plan
      const pricesToSave = planPrices
        .filter((p) => p.coachPrice !== null && p.coachPrice !== "")
        .map((p) => ({
          sportPlanId: p.id,
          price: parseFloat(String(p.coachPrice)),
        }));

      if (pricesToSave.length > 0) {
        await api.put("/fee/coach/plan-prices", { prices: pricesToSave });
      }
      
      toast.success("Configuración guardada");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAlias = () => {
    if (config.paymentAlias) {
      navigator.clipboard.writeText(config.paymentAlias);
      setCopied(true);
      toast.success("Alias copiado");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Datos de Pago" backHref="/coach/profile" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Datos de Pago" backHref="/coach/profile" />

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text">
                  Configurá tus precios y datos de pago para tus alumnos.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Define cuánto cobrás por cada plan y tu alias para recibir transferencias.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Precios por Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Tus precios por plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingPlans ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : planPrices.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-text-muted">
                    No hay planes disponibles.
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Verificá que tengas deportes asignados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {planPrices.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-3 rounded-lg border ${
                        plan.coachPrice
                          ? "border-success/30 bg-success/5"
                          : "border-border bg-background/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-text">
                            {plan.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {plan.sport?.name || "Sin deporte"}
                            </Badge>
                            <span className="text-xs text-text-muted">
                              {plan.weeklyFrequency}x/sem
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          value={plan.coachPrice || ""}
                          onChange={(e) =>
                            handlePlanPriceChange(plan.id, e.target.value)
                          }
                          placeholder={
                            plan.defaultPrice
                              ? `${plan.defaultPrice} (base)`
                              : "Precio"
                          }
                          className="bg-background border-border pl-7 h-9"
                        />
                      </div>
                      {plan.defaultPrice && !plan.coachPrice && (
                        <p className="text-xs text-text-muted mt-1">
                          Precio base del sistema: ${Number(plan.defaultPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-text-muted mt-2">
                Configurá el precio que cobrás por cada plan. Si no ponés precio, se usa el precio base del sistema.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Alias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-success" />
                Alias de MercadoPago / CVU
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-text-muted text-sm">Tu alias</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={config.paymentAlias}
                    onChange={(e) =>
                      setConfig({ ...config, paymentAlias: e.target.value })
                    }
                    placeholder="ej: tu.nombre.mp"
                    className="bg-background border-border flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAlias}
                    disabled={!config.paymentAlias}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Este alias se mostrará a tus alumnos para que te transfieran
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Instrucciones de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-text-muted text-sm">
                  Notas adicionales (opcional)
                </Label>
                <Textarea
                  value={config.paymentNotes}
                  onChange={(e) =>
                    setConfig({ ...config, paymentNotes: e.target.value })
                  }
                  placeholder="Ej: Enviar comprobante por WhatsApp al 11-xxxx-xxxx"
                  className="bg-background border-border mt-1 min-h-[80px]"
                />
                <p className="text-xs text-text-muted mt-1">
                  Instrucciones que verán tus alumnos al pagar
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview */}
        {config.paymentAlias && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-surface to-background border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-muted">
                  👁️ Vista previa (lo que verán tus alumnos)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="text-xs text-text-muted mb-2">Transferir a:</p>
                  <p className="text-lg font-bold text-success">
                    {config.paymentAlias}
                  </p>
                  {config.paymentNotes && (
                    <p className="text-sm text-text-muted mt-2 italic">
                      "{config.paymentNotes}"
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
