import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { OwnershipError } from "@/lib/db/ownership";
import { getCurrentProjectId, setCurrentProjectCookie } from "@/lib/projects/context";
import {
  createProject,
  createProjectSchema,
  listProjects,
} from "@/lib/projects/service";

/**
 * /api/projects — loyihalar ro'yxati (GET) va yangi loyiha yaratish (POST).
 * Egalik har doim tekshiriladi; xatolar markazlashgan handler orqali mapping qilinadi.
 */

/** OwnershipError → 404, ZodError → 400, user yo'q → 401. */
function errorResponse(err: unknown): NextResponse {
  if (err instanceof OwnershipError) {
    return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.flatten() }, { status: 400 });
  }
  throw err;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const [projects, currentProjectId] = await Promise.all([
      listProjects(user.id),
      getCurrentProjectId(user.id),
    ]);

    return NextResponse.json({ projects, currentProjectId });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const input = createProjectSchema.parse(body);

    const project = await createProject(user.id, input);
    await setCurrentProjectCookie(project.id);

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
