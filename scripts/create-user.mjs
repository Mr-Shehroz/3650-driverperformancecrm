// Usage:
// node --env-file=.env.local scripts/create-user.mjs <email> "<Full Name>" <admin|driver|sales_rep> [phone] [password]
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, name, role = "driver", phone = "", customPassword = ""] =
    process.argv.slice(2);

  if (!email || !name || !["admin", "driver", "sales_rep"].includes(role)) {
    console.error(
      'Usage: node --env-file=.env.local scripts/create-user.mjs <email> "<Full Name>" <admin|driver|sales_rep> [phone] [password]',
    );
    return 1;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    return 1;
  }
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    console.error(`NEXT_PUBLIC_SUPABASE_URL looks wrong: "${url}"`);
    console.error(
      "It should look like: https://abcdefghijk.supabase.co  (nothing after .co)",
    );
    return 1;
  }

  let password = customPassword;
  if (password) {
    if (password.length < 6) {
      console.error("Password must be at least 6 characters.");
      return 1;
    }
  } else {
    const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    password = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role }, // only the service key can set this
    user_metadata: { name, phone },
  });

  if (error) {
    console.error("Failed:", error.message);
    return 1;
  }

  console.log("\n✅ User created");
  console.log("   ID:       ", data.user.id);
  console.log("   Email:    ", email);
  console.log("   Role:     ", role);
  console.log("   Password: ", password);
  console.log(
    "\nThey can change the password from My profile after logging in.\n",
  );
  return 0;
}

// Set the exit code instead of calling process.exit() (avoids a Node crash on Windows)
main().then((code) => {
  process.exitCode = code;
});
