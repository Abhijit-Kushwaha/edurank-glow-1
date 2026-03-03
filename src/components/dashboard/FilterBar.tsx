import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFilters, FILTER_OPTIONS } from "@/contexts/FilterContext";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export const FilterBar = () => {
  const { filters, setFilters, resetFilters } = useFilters();
  const [open, setOpen] = useState(false);

  const activeCount = [filters.class, filters.subject, filters.board, filters.language !== "English" ? filters.language : null]
    .filter(Boolean).length;

  const availableSubjects = filters.class
    ? FILTER_OPTIONS.subjects[filters.class] || []
    : [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeCount}
              </Badge>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-3">
        <div className="glass-card rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select
              value={filters.class || ""}
              onValueChange={(v) => setFilters({ class: v || null })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Select
              value={filters.subject || ""}
              onValueChange={(v) => setFilters({ subject: v || null })}
              disabled={!filters.class}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={filters.class ? "Select subject" : "Pick class first"} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Board */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Board</label>
            <Select
              value={filters.board || ""}
              onValueChange={(v) => setFilters({ board: (v || null) as any })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.boards.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Language</label>
            <Select
              value={filters.language || "English"}
              onValueChange={(v) => setFilters({ language: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.languages.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
