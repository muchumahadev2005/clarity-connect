import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Star,
  History,
  Sparkles,
  Eye,
  Check,
  X,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { CATEGORIES, TEMPLATES, MailTemplate, TemplateCategory } from "./templates";
import { cn } from "@/lib/utils";

interface TemplateLibraryProps {
  onSelectTemplate: (template: MailTemplate) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onBack, onSkip }: TemplateLibraryProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<MailTemplate | null>(null);

  // Load favorites & recents from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFavs = localStorage.getItem("securesend.templates.favorites");
      if (storedFavs) setFavorites(JSON.parse(storedFavs));

      const storedRecents = localStorage.getItem("securesend.templates.recents");
      if (storedRecents) setRecents(JSON.parse(storedRecents));
    }
  }, []);

  // Save favorites to LocalStorage
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter((fId) => fId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem("securesend.templates.favorites", JSON.stringify(updated));
  };

  // Add a template to recently used
  const trackRecent = (id: string) => {
    const updated = [id, ...recents.filter((rId) => rId !== id)].slice(0, 5);
    setRecents(updated);
    localStorage.setItem("securesend.templates.recents", JSON.stringify(updated));
  };

  const handleSelect = (template: MailTemplate) => {
    trackRecent(template.id);
    onSelectTemplate(template);
  };

  // Filter templates by selected category or search query
  const filteredTemplates = TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategoryId ? tpl.categoryId === selectedCategoryId : true;

    if (searchQuery.trim() === "") {
      return matchesCategory;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tpl.title.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.subject.toLowerCase().includes(q) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(q));

    return matchesSearch;
  });

  const selectedCategory = CATEGORIES.find((c) => c.id === selectedCategoryId);

  // Get favorite templates list
  const favoriteTemplates = TEMPLATES.filter((tpl) => favorites.includes(tpl.id));

  // Get recent templates list
  const recentTemplates = recents
    .map((rId) => TEMPLATES.find((tpl) => tpl.id === rId))
    .filter((tpl): tpl is MailTemplate => !!tpl);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={selectedCategoryId ? () => setSelectedCategoryId(null) : onBack}
            className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {selectedCategoryId
                ? `${selectedCategory?.icon} ${selectedCategory?.name}`
                : "Template Library"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedCategoryId
                ? selectedCategory?.description
                : "Select a professional category or template to prefill your anonymous email."}
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-anon px-5 py-2.5 text-sm font-medium text-anon-foreground shadow-elegant hover:shadow-floating hover:opacity-95 transition-all w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4" /> Skip & Write Blank Email
        </button>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates by title, description, or tags (e.g. 'offer')..."
          className="w-full rounded-2xl border border-border bg-surface px-12 py-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-anon/50 focus:ring-2 focus:ring-anon/15 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* SEARCH RESULTS VIEW */}
      {searchQuery.trim() !== "" ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Search Results ({filteredTemplates.length})
          </h3>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-base font-semibold text-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try checking your spelling or searching for another tag.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isFavorite={favorites.includes(template.id)}
                  onSelect={handleSelect}
                  onFavorite={toggleFavorite}
                  onPreview={setPreviewTemplate}
                />
              ))}
            </div>
          )}
        </div>
      ) : selectedCategoryId ? (
        /* SINGLE CATEGORY TEMPLATES VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Templates in {selectedCategory?.name}
            </h3>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="text-xs font-medium text-anon hover:underline"
            >
              Back to Categories
            </button>
          </div>
          {filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              No templates available in this category.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isFavorite={favorites.includes(template.id)}
                  onSelect={handleSelect}
                  onFavorite={toggleFavorite}
                  onPreview={setPreviewTemplate}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MAIN DASHBOARD (CATEGORIES + RECENTS + FAVORITES) */
        <div className="space-y-8">
          {/* Recents (if any) */}
          {recentTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-4 w-4 text-anon" />
                Recently Used
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentTemplates.map((template) => (
                  <CompactTemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Favorites (if any) */}
          {favoriteTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                Starred Templates
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteTemplates.map((template) => (
                  <CompactTemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-4 w-4 text-anon" />
              Browse by Category
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className="group flex flex-col items-start rounded-2xl border border-border bg-surface p-5 text-left shadow-sm hover:border-anon/30 hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <div className="text-3xl mb-3 duration-300 group-hover:scale-110">
                    {category.icon}
                  </div>
                  <div className="font-semibold text-foreground group-hover:text-anon transition-colors">
                    {category.name}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-anon/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    View templates <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-floating flex flex-col overflow-hidden max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-muted">
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Template Preview: {previewTemplate.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Subject: {previewTemplate.subject}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Email Body Layout Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-muted/20 space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3 font-sans">
                {/* Simulated Email Headers */}
                <div className="text-xs text-muted-foreground space-y-1 pb-3 border-b border-border/60">
                  <div>
                    <span className="font-medium text-foreground">From:</span>{" "}
                    alias@securesend.co.in (Anonymous)
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Subject:</span>{" "}
                    {previewTemplate.subject}
                  </div>
                </div>

                {/* Main Content Layout */}
                <div className="pt-2 text-sm text-foreground leading-relaxed space-y-4">
                  {previewTemplate.header && (
                    <div className="inline-block rounded bg-anon-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-anon">
                      {previewTemplate.header}
                    </div>
                  )}

                  <div className="font-medium">{previewTemplate.greeting}</div>

                  <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {previewTemplate.body ||
                      "(Body content placeholder. Write your message in the composer.)"}
                  </div>

                  <div className="pt-2 font-medium text-muted-foreground">
                    {previewTemplate.footer}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-surface-muted">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const tpl = previewTemplate;
                  setPreviewTemplate(null);
                  handleSelect(tpl);
                }}
                className="rounded-full bg-anon px-6 py-2 text-sm font-medium text-anon-foreground hover:opacity-95 transition-opacity"
              >
                Use this Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* SUBCOMPONENTS */

interface TemplateCardProps {
  template: MailTemplate;
  isFavorite: boolean;
  onSelect: (tpl: MailTemplate) => void;
  onFavorite: (e: React.MouseEvent, id: string) => void;
  onPreview: (tpl: MailTemplate) => void;
}

function TemplateCard({
  template,
  isFavorite,
  onSelect,
  onFavorite,
  onPreview,
}: TemplateCardProps) {
  const category = CATEGORIES.find((c) => c.id === template.categoryId);

  return (
    <div
      onClick={() => onSelect(template)}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left shadow-sm hover:border-anon/30 hover:shadow-elegant transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-anon-soft px-2 py-0.5 text-[10px] font-semibold text-anon ring-1 ring-anon/10">
            {category?.icon} {category?.name}
          </span>
          <button
            onClick={(e) => onFavorite(e, template.id)}
            className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors"
          >
            <Star
              className={cn(
                "h-4.5 w-4.5 transition-colors",
                isFavorite
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground hover:text-amber-400",
              )}
            />
          </button>
        </div>

        <h4 className="mt-3 font-semibold text-foreground group-hover:text-anon transition-colors">
          {template.title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/55 pt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(template);
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-anon opacity-0 group-hover:opacity-100 transition-opacity">
          Use template <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

interface CompactTemplateCardProps {
  template: MailTemplate;
  onSelect: (tpl: MailTemplate) => void;
}

function CompactTemplateCard({ template, onSelect }: CompactTemplateCardProps) {
  const category = CATEGORIES.find((c) => c.id === template.categoryId);

  return (
    <div
      onClick={() => onSelect(template)}
      className="group flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 hover:border-anon/30 hover:shadow-sm cursor-pointer transition-all duration-200"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0">{category?.icon}</span>
          <div className="font-medium text-sm text-foreground truncate group-hover:text-anon transition-colors">
            {template.title}
          </div>
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
          Subject: {template.subject}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
