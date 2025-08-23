
"use client";

import React, { useState, useTransition } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button"; // Keep if standalone trigger is ever needed
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeleteMeetingSeriesAlertProps {
  seriesId: string;
  seriesName: string;
  deleteMeetingSeriesAction: (seriesId: string) => Promise<{ success: boolean; message: string }>;
  onOpenChange: (open: boolean) => void; // To control its own visibility from parent
  onSuccess?: () => void; // Callback on successful deletion
  triggerButton?: React.ReactNode; // Optional external trigger
}

export default function DeleteMeetingSeriesAlert({ 
  seriesId, 
  seriesName, 
  deleteMeetingSeriesAction,
  onOpenChange,
  onSuccess,
  triggerButton
}: DeleteMeetingSeriesAlertProps) {
  const [isInternalOpen, setIsInternalOpen] = useState(false); // Use internal state if no trigger
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    setIsInternalOpen(open);
    onOpenChange(open); // Notify parent if it's controlling visibility
  };

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteMeetingSeriesAction(seriesId);
      if (result.success) {
        toast({
          title: "Serie Eliminada",
          description: result.message,
        });
        handleOpenChange(false); // Close this alert
        if (onSuccess) onSuccess(); // Call parent's success callback
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  // Determine if the component should use its own trigger or an external one.
  const TriggerComponent = triggerButton ? 
    React.cloneElement(triggerButton as React.ReactElement, { onClick: () => handleOpenChange(true) }) : 
    ( // Default trigger if none provided (though less likely with the new structure)
      <Button variant="destructive" size="sm" onClick={() => handleOpenChange(true)}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar Serie (Default Trigger)
      </Button>
    );


  return (
    <AlertDialog open={isInternalOpen} onOpenChange={handleOpenChange}>
      {!triggerButton && <AlertDialogTrigger asChild>{TriggerComponent}</AlertDialogTrigger>}
      {triggerButton && TriggerComponent}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro de que desea eliminar la serie &quot;{seriesName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la serie de reuniones, todas sus instancias programadas y todos los registros de asistencia asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={() => handleOpenChange(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Eliminando..." : "Sí, eliminar serie"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
