
"use client";

import React, { useTransition } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeleteMeetingInstanceAlertProps {
  instanceName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<{ success: boolean; message: string }>; // This promise is key
}

export default function DeleteMeetingInstanceAlert({
  instanceName,
  isOpen,
  onOpenChange,
  onConfirmDelete,
}: DeleteMeetingInstanceAlertProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await onConfirmDelete(); // Call the promise passed from parent
      // The parent (ManageMeetingInstanceDialog) will handle toast and navigation for success.
      // Only show toast here if there's an error during the delete action itself.
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
      // Parent will close the alert via onOpenChange if successful.
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro de que desea eliminar la instancia &quot;{instanceName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la instancia de la reunión y todos sus registros de asistencia asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Eliminando..." : "Sí, eliminar instancia"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
