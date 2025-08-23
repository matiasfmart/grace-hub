'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import DefineMeetingSeriesForm from '@/components/events/add-meeting-form';
import { defineMeetingSeriesAction } from '@/app/events/page'; 
import type { DefineMeetingSeriesFormValues, Meeting } from '@/lib/types';


export default function GlobalAddMeetingTrigger() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="whitespace-nowrap">
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Reunión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Reunión Globalmente</DialogTitle>
          <DialogDescription>
            Complete los detalles para la nueva reunión.
          </DialogDescription>
        </DialogHeader>
        <DefineMeetingSeriesForm 
          defineMeetingSeriesAction={defineMeetingSeriesAction} 
          onSuccess={handleFormSuccess} 
          seriesTypeContext="general"
        />
      </DialogContent>
    </Dialog>
  );
}