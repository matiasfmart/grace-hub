"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type LoadingState = "pdf" | "excel" | "pdfAll" | "excelAll" | null;

interface ExportButtonProps {
  /** Texto del botón. Default: "Exportar" */
  label?: string;
  /** Callback que genera y descarga el PDF (datos filtrados). Puede ser async. */
  onPdf: () => void | Promise<void>;
  /** Callback que genera y descarga el Excel (datos filtrados). Puede ser async. */
  onExcel: () => void | Promise<void>;
  /**
   * Cuando se provee, agrega una sección "Todos" al dropdown.
   * Exporta todos los registros sin aplicar filtros de paginado ni de búsqueda.
   */
  onPdfAll?: () => void | Promise<void>;
  onExcelAll?: () => void | Promise<void>;
  /** Etiqueta para la sección de filtrados. Default: "Filtrados" */
  filteredLabel?: string;
  /** Etiqueta para la sección de todos. Default: "Todos" */
  allLabel?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Variante visual del botón. Default: "outline" */
  variant?: "outline" | "ghost" | "secondary";
}

/**
 * Botón reutilizable de exportar con dropdown PDF / Excel.
 *
 * REGLA: este componente NO recibe datos. Solo recibe callbacks.
 * La lógica de construcción de datos queda en el componente que lo usa.
 *
 * Cuando se proveen onPdfAll / onExcelAll se muestra un dropdown agrupado:
 *   Filtrados → PDF / Excel
 *   Todos     → PDF / Excel
 */
export function ExportButton({
  label = "Exportar",
  onPdf,
  onExcel,
  onPdfAll,
  onExcelAll,
  filteredLabel = "Filtrados",
  allLabel = "Todos",
  disabled = false,
  size = "sm",
  variant = "outline",
}: ExportButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<LoadingState>(null);

  const handleExport = async (format: LoadingState) => {
    if (!format) return;
    setLoading(format);
    try {
      if (format === "pdf") await onPdf();
      else if (format === "excel") await onExcel();
      else if (format === "pdfAll" && onPdfAll) await onPdfAll();
      else if (format === "excelAll" && onExcelAll) await onExcelAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast({
        title: "Error al exportar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;
  const hasAllSection = Boolean(onPdfAll && onExcelAll);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasAllSection ? (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {filteredLabel}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleExport("pdf")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2 text-red-500" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {allLabel}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleExport("pdfAll")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2 text-red-500" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("excelAll")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleExport("pdf")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2 text-red-500" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
