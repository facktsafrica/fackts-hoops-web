import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function officialPlayerRole(role?: string | null) {
  const cleanRole = String(role ?? "").toLowerCase();
  return !cleanRole.includes("guest") && !cleanRole.includes("prospect");
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  const adminLogin = pathname === "/admin/login";
  const adminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const playerLogin = pathname === "/player/login";
  const playerRoute = pathname === "/player" || pathname.startsWith("/player/");
  const playerOnlyRoute = playerRoute && !playerLogin;
  const calendarRoute = pathname === "/calendar";

  let isAdmin = false;
  let isPlayer = false;

  if (user && adminRoute) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    isAdmin = Boolean(profile);
  }

  if (user && (playerRoute || calendarRoute)) {
    const { data: player } = await supabase
      .from("players")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    isPlayer = Boolean(player && officialPlayerRole(player.role));
  }

  if (adminLogin && isAdmin) {
    return copyCookies(response, NextResponse.redirect(new URL("/admin", request.url)));
  }

  if (adminRoute && !adminLogin && !isAdmin) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (playerLogin && isPlayer) {
    return copyCookies(response, NextResponse.redirect(new URL("/player", request.url)));
  }

  if ((playerOnlyRoute || calendarRoute) && !isPlayer) {
    const loginUrl = new URL("/player/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/player/:path*", "/calendar"],
};
