// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/api/public"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value },
  set(name, value, options) { res.cookies.set({ name, value, ...options }) },
  remove(name, options) { res.cookies.set({ name, value: "", ...options, maxAge: 0 }) },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isAsset = /^\/_next|favicon\.ico|robots\.txt|sitemap\.xml|images|fonts|public\b/.test(path);
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p)) || isAsset;

  // bereits eingeloggt -> weg von /login
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // nicht eingeloggt -> auf /login umleiten
  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // nur relative redirect-Werte erlauben (kein offener Redirect)
    url.searchParams.set("redirect", encodeURIComponent(path + req.nextUrl.search));
    return NextResponse.redirect(url);
  }

  // harte No-Cache-Defaults für alles Dynamische
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: [
    // schützt alles außer Assets/öffentliche Dateien
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|fonts/|public/).*)",
  ],
};
