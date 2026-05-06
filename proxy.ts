import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const basicAuth = request.headers.get("authorization");

  const username = process.env.ADMIN_USERNAME || "fackts";
  const password = process.env.ADMIN_PASSWORD || "change-this-password";

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const decoded = atob(authValue);
    const [user, pass] = decoded.split(":");

    if (user === username && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="FACKTS Admin"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
