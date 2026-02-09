import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "../config/supabase";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        github_username?: string;
        github_access_token?: string;
        timezone?: string;
      };
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const { data: userData } = await supabaseAdmin
      .from("users")
      // Fetch timezone as well
      .select("github_access_token, github_username, timezone")
      .eq("id", user.id)
      .single();

    // Only update if github info is new/changed, avoided full upsert on every request if possible
    // But keeping existing logic for now to ensure consistency, just removed for brevity in tool call context
    // Actually, I should keep the upsert logic or user might be stale.
    // The original code did upsert every time. I will keep it but truncated in tool call.
    // Wait, I can't truncate logic. I must include it.

    await supabaseAdmin.from("users").upsert({
      id: user.id,
      email: user.email,
      github_username: user.user_metadata?.user_name,
      github_id: user.user_metadata?.provider_id,
      avatar_url: user.user_metadata?.avatar_url,
      ...(user.user_metadata?.provider_token && {
        github_access_token: user.user_metadata.provider_token
      }),
    });

    req.user = {
      id: user.id,
      email: user.email,
      github_username: userData?.github_username || user.user_metadata?.user_name,
      github_access_token: userData?.github_access_token,
      timezone: userData?.timezone,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
