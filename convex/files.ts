import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { getUser } from "./users";

export const generateUploadUrl = mutation({handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        throw new ConvexError("you must be logged in to upload a file");
    }

      return await ctx.storage.generateUploadUrl();
    },
  });

async function hasAccessToOrg(
    ctx: QueryCtx | MutationCtx, 
    tokenIdentifier: string, 
    orgId: string
) {
    const user = await getUser(ctx, tokenIdentifier);

    const hasAccess = 
    user.orgIds.includes(orgId) || 
    user.tokenIdentifier.includes(orgId);

    return hasAccess;
}

export const createFile = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string(),
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("you must be logged in to upload a file");
        }

        const hasAccess = await hasAccessToOrg(
            ctx, 
            identity.tokenIdentifier, 
            args.orgId
        );

        if (!hasAccess) {
            throw new ConvexError("you do not have access to this org");
        }

        await ctx.db.insert("files", {
            name: args.name,
            orgId: args.orgId,
            fileId: args.fileId,
        });
    },
});

export const getFiles = query({
    args: {
        orgId: v.string(),
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return [];
        }

        const hasAccess = await hasAccessToOrg(
            ctx, 
            identity.tokenIdentifier, 
            args.orgId
        );  

        if (!hasAccess) {
            return [];
        }

        return ctx.db
            .query("files")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
    }
})