import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { getUser } from "./users";
import { fileTypes } from "./schema";
import { Doc, Id } from "./_generated/dataModel";

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
    orgId: string
) {

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        return null;
    }

    const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

    if (!user) {
        return null;
    }

    const hasAccess = 
    user.orgIds.some(item => item.orgId === orgId) || 
    user.tokenIdentifier.includes(orgId);

    if (!hasAccess) {
        return null
    }

    return { user };
}

export const createFile = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string(),
        type: fileTypes,
    },
    async handler(ctx, args) {

        const hasAccess = await hasAccessToOrg(
            ctx, 
            args.orgId
        );

        if (!hasAccess) {
            throw new ConvexError("you do not have access to this org");
        }

        await ctx.db.insert("files", {
            name: args.name,
            type: args.type,
            orgId: args.orgId,
            fileId: args.fileId,
            userId: hasAccess.user._id,
        });
    },
});

export const getFiles = query({
    args: {
        orgId: v.string(),
        query: v.optional(v.string()),
        favorites: v.optional(v.boolean()),
        deletedOnly: v.optional(v.boolean()),
        type: v.optional(fileTypes),
    },
    async handler(ctx, args) {

        const hasAccess = await hasAccessToOrg(
            ctx, 
            args.orgId
        );  

        if (!hasAccess) {
            return [];
        }

        let files = await ctx.db
            .query("files")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        const query = args.query;

        if (query) {
            files = files.filter(file => file.name.toLowerCase().includes(query.toLowerCase()));
        }

        if (args.favorites) {

             const favorites = await ctx.db
             .query("favorites")
             .withIndex("by_userId_orgId_fileId", (q) => 
                q.eq("userId", hasAccess.user._id).eq("orgId", args.orgId))
             .collect();

             files = files.filter(file => 
                favorites.some((favorite) => favorite.fileId === file._id)
            );
        }

        if (args.deletedOnly) {
            files = files.filter(file => file.shouldDelete);
       } else {
            files = files.filter(file => !file.shouldDelete);
       }

       if (args.type) {
        files = files.filter((file) => file.type === args.type);
       }

        return files;
    },
})

export const getFileUrl = query({
    args: {
        fileId: v.id("_storage"),
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("you must be logged in to access files");
        }

        return await ctx.storage.getUrl(args.fileId);
    },
});

export const deleteAllFiles = internalMutation({
    args: {},
    async handler(ctx, args) {
        const files = await ctx.db.query("files")
        .withIndex("by_shouldDelete", (q) => q.eq("shouldDelete", true))
        .collect();

        await Promise.all(files.map(async (file) => {
            await ctx.storage.delete(file.fileId);
            return ctx.db.delete(file._id);
        }));
    },
})

function assertCanDeleteFile(user: Doc<"users">, file: Doc<"files">) {
    const canDelete = 
        user._id === file.userId ||
        user.orgIds.find((org) => org.orgId === file.orgId)
            ?.role === "org:admin";
        
    if (!canDelete) {
        throw new ConvexError("you do not have permission to delete this file");
    }
}

export const deleteFile = mutation({
    args: {
        fileId: v.id("files"),
    },
    async handler(ctx, args) {
        const access = await hasAccessToFile(ctx, args.fileId);

        if (!access) {
            throw new ConvexError("you do not have access to this file");
        }

        assertCanDeleteFile(access.user, access.file);
        
        await ctx.db.patch(args.fileId, {
            shouldDelete: true,
        });
    },
})

export const restoreFile = mutation({
    args: {
        fileId: v.id("files"),
    },
    async handler(ctx, args) {
        const access = await hasAccessToFile(ctx, args.fileId);

        if (!access) {
            throw new ConvexError("you do not have access to this file");
        }

        assertCanDeleteFile(access.user, access.file);
        
        await ctx.db.patch(args.fileId, {
            shouldDelete: false,
        });
    },
})

export const toggleFavorite = mutation({
    args: {
        fileId: v.id("files"),
    },
    async handler(ctx, args) {
        const access = await hasAccessToFile(ctx, args.fileId);

        if (!access) {
            throw new ConvexError("you do not have access to this file");
        }
        
        const favorite = await ctx.db.query("favorites")
            .withIndex("by_userId_orgId_fileId", (q) => 
                q.eq("userId", access.user._id).eq("orgId", access.file.orgId).eq("fileId", args.fileId))
            .first();

        if (!favorite) {
            await ctx.db.insert("favorites", {
                fileId: access.file._id,
                userId: access.user._id,
                orgId: access.file.orgId,
            });
        } else {
            await ctx.db.delete(favorite._id);
        }
    },
})

export const getAllFavorites = query({
    args: {
        orgId: v.string(),
    },
    async handler(ctx, args) {

        const hasAccess = await hasAccessToOrg(ctx, args.orgId);

        if (!hasAccess) {
            return [];
        }
        
        const favorites = await ctx.db.query("favorites")
        .withIndex("by_userId_orgId_fileId", (q) => 
            q.eq("userId", hasAccess.user._id).eq("orgId", args.orgId)
        )
        .collect();

        return favorites;

    },
})

async function hasAccessToFile(ctx: QueryCtx | MutationCtx, fileId: Id<"files">) {

        const file = await ctx.db.get(fileId)

        if (!file) {
            return null;
        }

        const hasAccess = await hasAccessToOrg(
            ctx, 
            file.orgId
        );

        if (!hasAccess) {
            return null;
        }

        return {
            user: hasAccess.user,
            file,
        }
}