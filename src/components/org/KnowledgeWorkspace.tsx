import { useState } from "react";
import { FileText, Plus, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface KnowledgePage {
  id: string;
  title: string;
  icon: string;
  is_published: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface KnowledgeWorkspaceProps {
  pages: KnowledgePage[];
  onCreatePage: (title: string, parentId?: string) => Promise<unknown>;
}

export default function KnowledgeWorkspace({ pages, onCreatePage }: KnowledgeWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const rootPages = pages.filter(p => !p.parent_id);
  const filtered = search
    ? rootPages.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : rootPages;

  const handleCreate = async () => {
    setCreating(true);
    await onCreatePage("Untitled Page");
    setCreating(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Knowledge Base
          </h2>
          <p className="text-sm text-muted-foreground">Notion-style pages for study materials, notes, and resources</p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Creating..." : "New Page"}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pages..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3" />
          <p className="font-medium">No pages yet</p>
          <p className="text-sm">Create a page to start building your knowledge base</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(page => {
            const childCount = pages.filter(p => p.parent_id === page.id).length;
            return (
              <Card key={page.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{page.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={page.is_published ? "default" : "outline"} className="text-[10px]">
                          {page.is_published ? "Published" : "Draft"}
                        </Badge>
                        {childCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">{childCount} sub-pages</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Updated {format(new Date(page.updated_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
