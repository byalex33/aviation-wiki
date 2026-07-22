import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Clock3, Images, Info, Link2, Plane, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ArticleBlockName } from "@/lib/article-markdown";

type ArticleBlockProps = {
  name: ArticleBlockName;
  attributes: Record<string, string>;
  children: ReactNode;
};

const blockMeta = {
  Infobox: { label: "At a glance", icon: Info },
  Notice: { label: "Notice", icon: AlertTriangle },
  Sidebar: { label: "More information", icon: BookOpen },
  Sources: { label: "Sources", icon: BookOpen },
  FleetTable: { label: "Fleet", icon: Plane },
  Specifications: { label: "Specifications", icon: SlidersHorizontal },
  Timeline: { label: "Timeline", icon: Clock3 },
  Gallery: { label: "Gallery", icon: Images },
  RelatedPages: { label: "Related pages", icon: Link2 },
} satisfies Record<ArticleBlockName, { label: string; icon: typeof Info }>;

export function ArticleBlock({ name, attributes, children }: ArticleBlockProps) {
  const { label, icon: Icon } = blockMeta[name];
  const title = attributes.title || label;
  const noticeVariant = attributes.variant || "info";

  if (name === "Notice") {
    return (
      <aside className={cn(
        "my-6 rounded-lg border-l-4 bg-muted/70 px-4 py-3.5",
        noticeVariant === "warning" && "border-l-amber-500 bg-amber-50",
        noticeVariant === "critical" && "border-l-destructive bg-destructive/5",
        noticeVariant === "info" && "border-l-primary bg-accent/60",
      )}>
        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4" />{title}</div>
        <div className="text-sm leading-6 text-foreground/80">{children}</div>
      </aside>
    );
  }

  return (
    <Card className={cn(
      "my-6 gap-0",
      name === "Sidebar" && "my-0 bg-muted/40",
      name === "Timeline" && "[&_li]:relative [&_li]:border-l-2 [&_li]:border-primary/25 [&_li]:pb-4 [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:-left-[5px] [&_li]:before:top-2 [&_li]:before:size-2 [&_li]:before:rounded-full [&_li]:before:bg-primary",
      name === "Gallery" && (attributes.columns === "2" ? "[&_[data-markdown-children]]:grid-cols-2" : "[&_[data-markdown-children]]:grid-cols-2 md:[&_[data-markdown-children]]:grid-cols-3"),
    )}>
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
          {name === "Infobox" && <Badge className="ml-auto" variant="secondary">Article data</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent
        data-markdown-children
        className={cn(
          "pt-4 text-sm leading-6 text-foreground/80",
          (name === "FleetTable" || name === "Specifications") && "overflow-x-auto",
          name === "Gallery" && "grid gap-3 [&_p]:m-0 [&_img]:aspect-[4/3] [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover",
          name === "Sources" && "[&_ol]:space-y-2",
          name === "RelatedPages" && "[&_ul]:grid [&_ul]:gap-2 sm:[&_ul]:grid-cols-2",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
