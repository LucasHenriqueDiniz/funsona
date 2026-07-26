require("dotenv").config({ path: require("path").join(__dirname, "..", "quiz-review", ".env") });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAll(bucket, prefix = "") {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // folder — recurse
        const nested = await listAll(bucket, path);
        all = all.concat(nested);
      } else {
        all.push({ path, size: item.metadata?.size ?? 0 });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  for (const bucket of ["quiz-images", "profile-media"]) {
    try {
      const objects = await listAll(bucket);
      const totalBytes = objects.reduce((a, o) => a + o.size, 0);
      console.log(`${bucket}: ${objects.length} objects, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      console.log(`${bucket}: ERROR ${e.message}`);
    }
  }
}
main();
