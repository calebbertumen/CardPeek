"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { CollectionCondition } from "@prisma/client";
import {
  addToCollection,
  CollectionError,
  removeFromCollection,
  removeManyFromCollectionByCard,
} from "@/services/collection.service";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { requireDbUser } from "@/lib/require-db-user";

export type AddToCollectionState =
  | { ok: true }
  | { ok: false; code: "UNAUTHORIZED" | "FREE_LIMIT_REACHED" | "VALIDATION" | "UNKNOWN"; message: string };

export type RemoveFromCollectionState =
  | { ok: true }
  | { ok: false; code: "UNAUTHORIZED" | "UNKNOWN"; message: string };

export type RemoveManyFromCollectionState =
  | { ok: true; removed: number }
  | { ok: false; code: "UNAUTHORIZED" | "VALIDATION" | "UNKNOWN"; message: string };

function parseCondition(raw: unknown): CollectionCondition | null {
  if (raw === "NM" || raw === "LP" || raw === "MP" || raw === "HP" || raw === "DMG") return raw;
  return null;
}

export async function addToCollectionAction(input: {
  cardId: string;
  cardName: string;
  imageUrl: string;
  setName?: string | null;
  cardNumber?: string | null;
  condition: CollectionCondition | string;
}): Promise<AddToCollectionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in to add cards to your collection." };
  }

  const dbUser = await requireDbUser(session).catch(() => null);
  if (!dbUser) {
    return { ok: false, code: "UNAUTHORIZED", message: "Your session is out of sync. Please sign out and sign back in." };
  }

  const planId = await getUserPlanId(dbUser.id);
  /** Starter matches search UX (no condition filters) — collection is always Near Mint. */
  const effectiveCondition: CollectionCondition | string =
    planId === "starter" ? "NM" : input.condition;

  const condition = parseCondition(effectiveCondition);
  if (!condition) {
    return { ok: false, code: "VALIDATION", message: "Please choose a condition." };
  }
  if (!input.cardId || !input.cardName || !input.imageUrl) {
    return { ok: false, code: "VALIDATION", message: "Missing card details. Please try again." };
  }

  try {
    await addToCollection(
      dbUser.id,
      {
        cardId: input.cardId,
        cardName: input.cardName,
        imageUrl: input.imageUrl,
        setName: input.setName ?? null,
        cardNumber: input.cardNumber ?? null,
      },
      condition,
    );

    revalidatePath("/dashboard");
    revalidatePath("/collection");
    return { ok: true };
  } catch (e) {
    if (e instanceof CollectionError) {
      return { ok: false, code: e.code, message: e.message };
    }
    console.error(e);
    return { ok: false, code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }
}

export async function removeFromCollectionAction(input: { collectionItemId: string }): Promise<RemoveFromCollectionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in to manage your collection." };
  }
  const dbUser = await requireDbUser(session).catch(() => null);
  if (!dbUser) {
    return { ok: false, code: "UNAUTHORIZED", message: "Your session is out of sync. Please sign out and sign back in." };
  }
  if (!input.collectionItemId) {
    return { ok: false, code: "UNKNOWN", message: "Missing item id. Please try again." };
  }
  try {
    await removeFromCollection({ userId: dbUser.id, collectionItemId: input.collectionItemId });
    revalidatePath("/dashboard");
    revalidatePath("/collection");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }
}

export async function removeManyFromCollectionAction(input: {
  cardId: string;
  condition: CollectionCondition | string;
  count: number;
}): Promise<RemoveManyFromCollectionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in to manage your collection." };
  }
  const dbUser = await requireDbUser(session).catch(() => null);
  if (!dbUser) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Your session is out of sync. Please sign out and sign back in.",
    };
  }

  const condition = parseCondition(input.condition);
  if (!condition) {
    return { ok: false, code: "VALIDATION", message: "Invalid condition." };
  }
  const count = Math.floor(Number(input.count));
  if (!input.cardId || !Number.isFinite(count) || count < 1) {
    return { ok: false, code: "VALIDATION", message: "Invalid removal amount." };
  }

  try {
    const res = await removeManyFromCollectionByCard({
      userId: dbUser.id,
      cardId: input.cardId,
      condition,
      count,
    });
    revalidatePath("/dashboard");
    revalidatePath("/collection");
    return { ok: true, removed: res.removed };
  } catch (e) {
    console.error(e);
    return { ok: false, code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }
}

