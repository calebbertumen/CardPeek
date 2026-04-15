import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCollectionCount, getCollectionPreviewGroups } from "@/services/collection.service";
import { requireDbUser } from "@/lib/require-db-user";
import { auth } from "@/lib/auth";

export async function CollectionPreviewCard({ userId }: { userId: string }) {
  const session = await auth();
  const dbUser = await requireDbUser(session).catch(() => ({ id: userId, email: "" }));
  const [count, previewGroups] = await Promise.all([
    getCollectionCount(dbUser.id),
    getCollectionPreviewGroups(dbUser.id, 5),
  ]);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">Collection</CardTitle>
            <CardDescription>
              {count === 0 ? "Track your favorite cards in one place." : `${count} card${count === 1 ? "" : "s"} saved`}
            </CardDescription>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/collection">View</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {previewGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-surface-alt/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No cards in your collection yet
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {previewGroups.map(({ item, quantity }) => (
              <div
                key={`${item.cardId}__${item.condition}`}
                className="relative aspect-[63/88] overflow-hidden rounded-xl border border-border/70 bg-surface-alt/40"
                title={item.cardName}
              >
                <Image
                  src={item.imageUrl}
                  alt={`${item.cardName} card`}
                  fill
                  className="object-contain p-1.5"
                  sizes="(max-width: 640px) 18vw, 72px"
                />
                {quantity > 1 ? (
                  <Badge
                    variant="secondary"
                    className="pointer-events-none absolute bottom-1 right-1 h-5 min-w-5 justify-center px-1 text-[10px] tabular-nums"
                  >
                    x{quantity}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

