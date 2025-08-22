"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps, useNavigation } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function CustomCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { displayMonth } = props

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(displayMonth.getFullYear(), Number(event.target.value))
    goToMonth(newMonth)
  }

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = new Date(Number(event.target.value), displayMonth.getMonth())
    goToMonth(newYear)
  }

  return (
    <div className="flex justify-center pt-1 relative items-center">
      <Select
        onValueChange={(value) => handleMonthChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)}
        value={displayMonth.getMonth().toString()}
      >
        <SelectTrigger className="w-[110px] h-7 text-sm">
          <SelectValue placeholder="Month">
            {format(displayMonth, "MMM")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i} value={i.toString()}>
              {format(new Date(displayMonth.getFullYear(), i), "MMM")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) => handleYearChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)}
        value={displayMonth.getFullYear().toString()}
      >
        <SelectTrigger className="w-[80px] h-7 text-sm ml-1">
          <SelectValue placeholder="Year">
            {format(displayMonth, "yyyy")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 200 }, (_, i) => {
            const year = new Date().getFullYear() - 100 + i
            return (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}


function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium sr-only",
        caption_dropdowns: "flex gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        vhidden: "sr-only",
        dropdown: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-fit bg-transparent p-0 opacity-100 text-sm font-medium"
        ),
        dropdown_month: "rdp-dropdown_month",
        dropdown_year: "rdp-dropdown_year",
        ...classNames,
      }}
      captionLayout="dropdown"
      fromYear={new Date().getFullYear() - 100}
      toYear={new Date().getFullYear() + 10}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
        Caption: CustomCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
